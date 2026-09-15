import React, { forwardRef } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { FieldLabel } from './FieldLabel';
import { Text } from './Text';

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** Grows to fit several lines — for notes rather than names. */
  multiline?: boolean;
  /**
   * What is wrong with the current value. Reddens the border and prints
   * underneath.
   *
   * The message is rendered here rather than by each form so every field in the
   * app reports a problem the same way, and so the wiring that makes it
   * *audible* — `accessibilityInvalid` plus the message being part of the
   * field's own hint — cannot be forgotten one form at a time.
   */
  error?: string;
  /** Right-aligned counter under the field, e.g. "120/4000". */
  hint?: string;
};

/**
 * The one text input in the app.
 *
 * The styling here was previously written inline, once per field, inside
 * StartCycleForm — border, radius, touch target, font, placeholder colour, all
 * repeated. This is that block, factored out, so a form is a list of fields
 * rather than a wall of style objects.
 *
 * `minHeight` is the theme's touch target rather than a font-derived height:
 * a text field small enough to look neat is a text field a farmer with wet or
 * calloused hands cannot reliably hit.
 *
 * Forwards its ref so a form can move focus from one field to the next on
 * "Next", and jump to the first field that failed on submit.
 */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, multiline, error, hint, accessibilityLabel, ...rest },
  ref,
) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <TextInput
        ref={ref}
        accessibilityLabel={accessibilityLabel ?? label}
        // Screen readers announce the problem with the field rather than
        // leaving a red border as the only signal, which is invisible to them
        // and to anyone who cannot distinguish the colour.
        accessibilityHint={error}
        aria-invalid={Boolean(error)}
        placeholderTextColor={theme.colors.muted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        // An input is a well: the depth pair is thrown inward and the fill
        // steps back to `bg`, so the field reads as cut into whatever it sits
        // on rather than laid on top of it. Applied to the TextInput itself
        // rather than to a wrapping Surface — wrapping one changes how it
        // measures and where focus lands.
        style={{
          minHeight: multiline ? theme.minTouchTarget * 2 : theme.minTouchTarget,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: multiline ? theme.spacing.md : 0,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: error ? theme.colors.danger : theme.colors.border,
          backgroundColor: theme.colors.bg,
          boxShadow: theme.sunken('sm'),
          color: theme.colors.text,
          fontFamily: theme.fontFamily.body,
          fontSize: theme.typeScale.body.fontSize,
        }}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color={theme.colors.danger}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" muted style={{ textAlign: 'right' }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
