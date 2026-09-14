import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, findNodeHandle, type TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sendContactMessage } from '../../shared/api/contactService';
import { NetworkError } from '../../shared/api/http';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { Button } from '../../shared/ui/Button';
import { Text } from '../../shared/ui/Text';
import { TextField } from '../../shared/ui/TextField';
import { EMPTY_CONTACT, hasErrors, validateContactForm, type ContactErrors, type ContactFields } from './contactForm';

const MESSAGE_LIMIT = 4000;

/** Order matters: it is the order focus jumps to the first thing that failed. */
const FIELD_ORDER: (keyof ContactFields)[] = ['name', 'email', 'phone', 'subject', 'message'];

/**
 * Write to the AgroMet team.
 *
 * A form, because that is what "contact us" has to mean on a phone. The
 * previous version of this screen listed addresses and left the person to
 * leave the app and compose something themselves — which asks them to do the
 * work, and quietly does nothing at all on a device with no mail client set up.
 *
 * Submits to `POST /api/contact`, which stores the message for whoever is on
 * duty. Nothing is emailed from the app, so nothing depends on a mail client
 * being configured.
 *
 * Deliberately one column of five fields and a button — no channel cards, no
 * office block, no decorative icons beside the inputs. Every element here is
 * either something to fill in or something that tells you what went wrong.
 */
export function ContactScreen() {
  const theme = useTheme();

  const [fields, setFields] = useState<ContactFields>(EMPTY_CONTACT);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [reference, setReference] = useState<number | null>(null);
  const [sent, setSent] = useState(false);

  // Whether the form has been submitted once. Before that, typing is never
  // interrupted by an error; after it, errors clear live as they are fixed —
  // scolding someone for a half-typed email they are still writing is the most
  // common way forms are made unpleasant.
  const submitted = useRef(false);
  const inputs = useRef<Partial<Record<keyof ContactFields, TextInput | null>>>({});
  const scroller = useRef<ScrollView>(null);

  function update(key: keyof ContactFields, value: string) {
    const next = { ...fields, [key]: value };
    setFields(next);
    if (submitted.current) setErrors(validateContactForm(next));
  }

  function focusFirstError(found: ContactErrors) {
    const first = FIELD_ORDER.find((key) => found[key]);
    // `contact` is not a field, so its error falls to the email input — the
    // first of the two that could satisfy it.
    const target = first ?? (found.contact ? 'email' : undefined);
    const input = target ? inputs.current[target] : undefined;
    if (!input) return;

    input.focus();

    // Focus alone does not reliably bring a field into view, and with the
    // questions above the form the first error can sit off the top of the
    // screen — an error nobody scrolls back to find is an error nobody fixes.
    const list = scroller.current;
    const handle = list ? findNodeHandle(list) : null;
    if (!handle) return;

    input.measureLayout(
      handle,
      (_x, y) => list?.scrollTo({ y: Math.max(y - 24, 0), animated: true }),
      // measureLayout throws if either node has gone; there is nothing to do
      // about it and the field is focused regardless.
      () => {},
    );
  }

  async function submit() {
    const found = validateContactForm(fields);
    submitted.current = true;
    setErrors(found);
    setFailure(null);

    if (hasErrors(found)) {
      focusFirstError(found);
      return;
    }

    setSubmitting(true);
    try {
      const created = await sendContactMessage(fields);
      setReference(created ?? null);
      setSent(true);
    } catch (error) {
      // The typed message is never cleared on failure. Losing what someone
      // wrote because the signal dropped is the one outcome this screen cannot
      // have — they are usually somewhere with bad signal, which is often why
      // they are writing in the first place.
      setFailure(
        error instanceof NetworkError
          ? 'We could not reach AgroMet. Your message is still here, try again when you have a signal.'
          : error instanceof Error
            ? error.message
            : 'Something went wrong. Your message is still here, so please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['left', 'right', 'bottom']}>
        <View
          style={{
            flex: 1,
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="checkmark-circle" size={56} color={theme.colors.accent} />
          <Text variant="h2" style={{ textAlign: 'center' }}>
            Message sent
          </Text>
          <Text variant="body" muted style={{ textAlign: 'center' }}>
            Thank you. The AgroMet team has your message and will reply to the contact details you gave.
          </Text>
          {reference ? (
            <Text variant="caption" muted>
              Reference #{reference}
            </Text>
          ) : null}
          <View style={{ height: theme.spacing.sm }} />
          <Button
            label="Write another message"
            variant="outline"
            onPress={() => {
              setFields(EMPTY_CONTACT);
              setErrors({});
              setReference(null);
              setSent(false);
              submitted.current = false;
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['left', 'right', 'bottom']}>
      {/* Without this the send button sits under the keyboard on both
          platforms, and the message box — the tallest field — scrolls out of
          reach the moment it is focused. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroller}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="body" muted>
            Ask about a forecast or an advisory, or report a problem with the app.
          </Text>

          <TextField
            ref={(input) => {
              inputs.current.name = input;
            }}
            label="NAME"
            value={fields.name}
            onChangeText={(value) => update('name', value)}
            error={errors.name}
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => inputs.current.email?.focus()}
            submitBehavior="submit"
          />

          <View style={{ gap: theme.spacing.md }}>
            <TextField
              ref={(input) => {
                inputs.current.email = input;
              }}
              label="EMAIL"
              value={fields.email}
              onChangeText={(value) => update('email', value)}
              error={errors.email}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => inputs.current.phone?.focus()}
              submitBehavior="submit"
            />

            <TextField
              ref={(input) => {
                inputs.current.phone = input;
              }}
              label="PHONE"
              value={fields.phone}
              onChangeText={(value) => update('phone', value)}
              error={errors.phone}
              placeholder="024 123 4567"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="next"
              onSubmitEditing={() => inputs.current.subject?.focus()}
              submitBehavior="submit"
            />

            {/* Belongs to the pair, not to either field: neither is wrong on its
                own when both are blank, so neither gets reddened. */}
            <Text variant="caption" color={errors.contact ? theme.colors.danger : theme.colors.muted}>
              {errors.contact ?? 'Fill in at least one so we can reply.'}
            </Text>
          </View>

          <TextField
            ref={(input) => {
              inputs.current.subject = input;
            }}
            label="SUBJECT"
            value={fields.subject}
            onChangeText={(value) => update('subject', value)}
            error={errors.subject}
            returnKeyType="next"
            onSubmitEditing={() => inputs.current.message?.focus()}
            submitBehavior="submit"
          />

          <TextField
            ref={(input) => {
              inputs.current.message = input;
            }}
            label="MESSAGE"
            value={fields.message}
            onChangeText={(value) => update('message', value)}
            error={errors.message}
            hint={fields.message.length > MESSAGE_LIMIT * 0.9 ? `${fields.message.length}/${MESSAGE_LIMIT}` : undefined}
            placeholder="What would you like to ask?"
            multiline
            maxLength={MESSAGE_LIMIT}
            // No returnKeyType: in a multiline field the return key has to
            // insert a newline, which is what someone writing a paragraph
            // expects it to do.
          />

          {failure ? (
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
              <Ionicons name="alert-circle-outline" size={18} color={theme.colors.danger} />
              <Text variant="body" color={theme.colors.danger} style={{ flex: 1 }}>
                {failure}
              </Text>
            </View>
          ) : null}

          <Button label="Send message" onPress={submit} loading={submitting} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
