import React, { useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';
import { AttachmentPanel, type AttachmentAction } from './AttachmentPanel';

/** The web client caps questions at 1000 characters before it will send one.
 * Enforced here, at the input, so a farmer meets the limit rather than a
 * rejection. */
const MAX_LENGTH = 1000;

const VOICE_NOTICE = 'Voice questions are not available yet. Type your question for now.';
const DOCUMENT_NOTICE = 'Documents are not supported yet. Type your question instead.';
const NO_REGION_NOTICE = 'Choose your town on the Home tab first, then try Location again.';

type Props = {
  onSend: (text: string) => void;
  isSending: boolean;
  isOnline: boolean;
  /** Offered by the attachment menu's Location row. */
  region?: string;
  /** Where the camera shortcut and the Camera/Photos rows lead: Crop Diagnose,
   * which is the app's real image feature. */
  onOpenDiagnose: () => void;
};

/**
 * The input row — attach, a pill field, a camera shortcut, one action button —
 * and the attachment grid that opens beneath it.
 *
 * This is the one place the chat leaves the shared `TextField` behind, and it is
 * a deliberate exception rather than drift. `TextField` is built for forms — a
 * `FieldLabel` above it, a rectangular `radii.md` box, a fixed height — and the
 * messaging idiom needs none of those and cannot use its shape: a fully rounded
 * pill that grows with the text. Everything it *would* have given us is still
 * taken from tokens (`minTouchTarget`, `surface`, `border`, `muted`
 * placeholder, the body type scale), so nothing here re-invents a value.
 *
 * The trailing slot is a **mic while the field is empty and a send arrow once
 * there is something to send**. That is the messaging convention, and it earns
 * its place: a permanently visible send button on an empty field is a control
 * that cannot be used, and two buttons side by side would cost a third of the
 * row on a 360dp screen.
 *
 * The camera keeps its own slot rather than sharing that one, because it stays
 * useful whether or not a question is half-typed — photographing a crop is a
 * different errand from sending the message.
 *
 * All four controls are round, icon-only, at the full 44dp target, and labelled
 * for screen readers. Icon-only because at the extra-large text size a worded
 * button pushes the field down to about half a line.
 *
 * The draft lives here rather than on the screen so a keystroke does not
 * re-render the transcript, and the attachment panel lives here too because it
 * writes into that draft.
 */
export function Composer({ onSend, isSending, isOnline, region, onOpenDiagnose }: Props) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  /** A one-line answer for the controls that cannot yet do what they suggest.
   * Shown in place of a silent no-op, and cleared as soon as the farmer types. */
  const [notice, setNotice] = useState<string | null>(null);

  const hasDraft = draft.trim().length > 0;
  const canSend = hasDraft && !isSending && isOnline;

  function changeDraft(next: string) {
    setDraft(next);
    if (notice) setNotice(null);
    if (panelOpen) setPanelOpen(false);
  }

  function submit() {
    if (!canSend) return;
    onSend(draft);
    setDraft('');
  }

  function handleAttachment(action: AttachmentAction) {
    setPanelOpen(false);
    setNotice(null);

    if (action === 'camera' || action === 'photos') {
      onOpenDiagnose();
      return;
    }

    if (action === 'location') {
      if (!region) {
        setNotice(NO_REGION_NOTICE);
        return;
      }
      // Appended to the draft rather than sent on its own: a bare location is
      // not a question, and the assistant already receives the region as
      // context. Saying it in the message is what makes the *answer* mention it.
      const sentence = `I am farming in the ${region} region.`;
      setDraft((current) => (current.trim() ? `${current.trim()} ${sentence}` : sentence));
      return;
    }

    setNotice(DOCUMENT_NOTICE);
  }

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {!isOnline ? (
        // No banner: OfflineBanner already renders app-wide from
        // app/_layout.tsx. This says the one thing specific to chat — that
        // unlike the rest of the app there is no cached answer to fall back on.
        <Text variant="caption" muted style={{ paddingHorizontal: theme.spacing.sm }}>
          You are offline. AgroMet AI needs a connection to answer.
        </Text>
      ) : null}

      {notice ? (
        <Text variant="caption" muted style={{ paddingHorizontal: theme.spacing.sm }}>
          {notice}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.xs }}>
        {/* One slot that both opens the grid and puts the keyboard back. The
            glyph swaps to a keyboard rather than an X because that names what
            tapping it returns you to, not merely that something closes. */}
        <RoundButton
          // Ionicons has no keyboard glyph — its `keypad` is a phone dialpad —
          // so this one control borrows MaterialCommunityIcons, the same family
          // the tab bar and the chat header already use for the robot.
          family={panelOpen ? 'material' : 'ionicons'}
          icon={panelOpen ? 'keyboard-outline' : 'add'}
          label={panelOpen ? 'Show keyboard' : 'Attach'}
          tone="quiet"
          onPress={() => {
            setNotice(null);
            setPanelOpen((open) => !open);
          }}
          disabled={isSending}
        />

        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            minHeight: theme.minTouchTarget,
            // Half the touch target, so the pill is a true semicircle at each
            // end however tall the text has made it.
            borderRadius: theme.minTouchTarget / 2,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: Platform.OS === 'ios' ? theme.spacing.sm : 0,
          }}
        >
          <TextInput
            accessibilityLabel="Ask AgroMet AI a question"
            placeholder={isOnline ? 'Message' : 'You are offline'}
            placeholderTextColor={theme.colors.muted}
            value={draft}
            onChangeText={changeDraft}
            multiline
            maxLength={MAX_LENGTH}
            editable={isOnline}
            style={{
              // Grows to about four lines, then scrolls inside the pill.
              maxHeight: theme.minTouchTarget + theme.typeScale.body.lineHeight * 3,
              color: theme.colors.text,
              fontFamily: theme.fontFamily.body,
              fontSize: theme.typeScale.body.fontSize,
              lineHeight: theme.typeScale.body.lineHeight,
            }}
          />
        </View>

        <RoundButton
          icon="camera"
          label="Photograph a crop"
          tone="quiet"
          onPress={onOpenDiagnose}
          disabled={isSending}
        />

        {hasDraft ? (
          <RoundButton icon="send" label="Send" onPress={submit} disabled={!canSend} busy={isSending} />
        ) : (
          <RoundButton
            icon="mic"
            label="Record a voice question"
            onPress={() => setNotice(VOICE_NOTICE)}
          />
        )}
      </View>

      {/* Below the row, so the field it feeds stays visible and usable. */}
      {panelOpen ? <AttachmentPanel onSelect={handleAttachment} /> : null}
    </View>
  );
}

type RoundButtonProps = {
  icon: string;
  /** Ionicons unless the glyph only exists in MaterialCommunityIcons. */
  family?: 'ionicons' | 'material';
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** `quiet` is the flat variant for the controls that flank the field rather
   * than terminate the row, so they do not compete with the send action. */
  tone?: 'accent' | 'quiet';
};

function RoundButton({
  icon,
  family = 'ionicons',
  label,
  onPress,
  disabled,
  busy,
  tone = 'accent',
}: RoundButtonProps) {
  const theme = useTheme();
  const size = theme.minTouchTarget;
  const Glyph = family === 'material' ? MaterialCommunityIcons : Ionicons;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(busy) }}
      disabled={disabled}
      onPress={onPress}
    >
      {({ pressed }) => (
        // Chrome on a nested View, never on the Pressable — Android drops a
        // Pressable's own background while still drawing its children.
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tone === 'accent' ? theme.colors.accent : 'transparent',
            opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          }}
        >
          <Glyph
            name={icon as never}
            size={tone === 'accent' ? 19 : 23}
            color={tone === 'accent' ? theme.colors.onAccent : theme.colors.muted}
          />
        </View>
      )}
    </Pressable>
  );
}
