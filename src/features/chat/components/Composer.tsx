import React, { useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';
import { useVoiceQuestion, MAX_RECORDING_MS } from '../useVoiceQuestion';
import { AttachmentPanel, type AttachmentAction } from './AttachmentPanel';
import { RecordingBar } from './RecordingBar';

/** The web client caps questions at 1000 characters before it will send one.
 * Enforced here, at the input, so a farmer meets the limit rather than a
 * rejection. */
const MAX_LENGTH = 1000;

const NO_REGION_NOTICE = 'Choose your town on the Home tab first, then try Location again.';

/** The field grows to about four lines, so a farmer writing a long question
 * cannot see how much room is left. The count appears only near the end, where
 * it is information rather than pressure. */
const COUNTER_SHOWS_FROM = MAX_LENGTH - 100;

type Props = {
  onSend: (text: string) => void;
  isSending: boolean;
  isOnline: boolean;
  /** Offered by the attachment menu's Location row. */
  region?: string;
  /** The town selected on Home, named in the Location sentence because it is
   * more use to the answer than the region alone. */
  town?: string;
  /** Where the Diagnose tile leads: Crop Diagnose, which keeps the photo,
   * numbers the steps and files the result. */
  onOpenDiagnose: () => void;
  /** Attaches a photo to the conversation itself, for a quick question that
   * does not need the full record. */
  onAttachPhoto: (source: 'camera' | 'photos') => void;
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
export function Composer({ onSend, isSending, isOnline, region, town, onOpenDiagnose, onAttachPhoto }: Props) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  /** A one-line answer for the controls that cannot yet do what they suggest.
   * Shown in place of a silent no-op, and cleared as soon as the farmer types. */
  const [notice, setNotice] = useState<string | null>(null);

  // A transcript is appended rather than replacing what is there, so a farmer
  // who typed half a question and then spoke the rest keeps both.
  const voice = useVoiceQuestion((text) => setDraft((current) => (current.trim() ? `${current.trim()} ${text}` : text)), setNotice);

  const hasDraft = draft.trim().length > 0;
  const canSend = hasDraft && !isSending && isOnline;
  const isRecording = voice.state === 'recording';

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
      // Attaches to the conversation now rather than navigating away from it.
      // The tiles used to hand the farmer off to the Diagnose screen mid
      // sentence, which lost whatever they had typed and answered a different
      // question from the one they were asking.
      onAttachPhoto(action);
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
      const sentence = town ? `I am farming near ${town} in the ${region} region.` : `I am farming in the ${region} region.`;
      setDraft((current) => (current.trim() ? `${current.trim()} ${sentence}` : sentence));
      return;
    }

    onOpenDiagnose();
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

      {draft.length >= COUNTER_SHOWS_FROM ? (
        <Text
          variant="caption"
          color={draft.length >= MAX_LENGTH ? theme.colors.warning : theme.colors.muted}
          style={{ paddingHorizontal: theme.spacing.sm, textAlign: 'right' }}
          accessibilityLabel={`${MAX_LENGTH - draft.length} characters left`}
        >
          {MAX_LENGTH - draft.length} left
        </Text>
      ) : null}

      {/* Spaced optically, not metrically. A transparent 44dp button reads only
          as its glyph, while the filled send/mic circle reads edge to edge — so
          equal `gap` values leave the bare icons looking marooned and the circle
          crowded. The quiet buttons are therefore narrowed to `QUIET_WIDTH` and
          given back their touch target with hitSlop, which puts ~10dp of
          apparent space between every pair in the row and 8dp at each end. */}
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

        {isRecording ? (
          <RecordingBar elapsedSeconds={voice.elapsedSeconds} maxSeconds={Math.floor(MAX_RECORDING_MS / 1000)} onCancel={voice.cancel} />
        ) : (
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
              // The caret and the selection handles both default to the platform
              // blue, which belongs to no part of this palette and reads as a
              // stray control on a green-accented screen. Accent also makes the
              // caret findable: on `surface` the default hairline was easy to
              // miss, so the field looked inert when it was in fact focused.
              cursorColor={theme.colors.accent}
              selectionColor={theme.colors.accent}
              // A multiline TextInput starts its text at the top of its box on
              // Android, which parks the caret against the pill's upper edge and
              // makes an empty single-line field look misaligned. Centring keeps
              // the caret on the pill's axis, and still centres the block once
              // the text wraps.
              textAlignVertical="center"
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
        )}

        {/* Attaches, rather than navigating. There used to be two cameras on
            this screen -- this one, which left for Crop Diagnose, and the
            identical glyph in the grid below, which attached a photo to the
            conversation. Same icon, two different outcomes, and no way to tell
            which you were about to get. The full crop check now has its own
            named tile in the grid. */}
        <RoundButton
          icon="camera"
          label="Photograph a crop"
          tone="quiet"
          onPress={() => onAttachPhoto('camera')}
          disabled={isSending || isRecording || !isOnline}
        />

        {hasDraft && !isRecording ? (
          <RoundButton icon="send" label="Send" onPress={submit} disabled={!canSend} busy={isSending} />
        ) : (
          <RoundButton
            icon={isRecording ? 'stop' : 'mic'}
            label={isRecording ? 'Stop recording and use it' : 'Record a voice question'}
            onPress={isRecording ? voice.finish : voice.start}
            disabled={voice.state === 'transcribing' || !isOnline}
            busy={voice.state === 'transcribing'}
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

/**
 * Width of a `quiet` button's box. Narrower than the 44dp touch target so its
 * glyph does not sit marooned in the middle of a transparent square; the
 * missing width is restored as hitSlop, so the tappable area is still 44dp.
 */
const QUIET_WIDTH = 36;

function RoundButton({ icon, family = 'ionicons', label, onPress, disabled, busy, tone = 'accent' }: RoundButtonProps) {
  const theme = useTheme();
  const isQuiet = tone === 'quiet';
  const height = theme.minTouchTarget;
  const width = isQuiet ? QUIET_WIDTH : theme.minTouchTarget;
  const Glyph = family === 'material' ? MaterialCommunityIcons : Ionicons;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(busy) }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={isQuiet ? { left: 4, right: 4 } : undefined}
    >
      {({ pressed }) => (
        // Chrome on a nested View, never on the Pressable — Android drops a
        // Pressable's own background while still drawing its children.
        <View
          style={{
            width,
            height,
            // Only the filled variant is a circle; a radius on a transparent
            // box is invisible, and half of a non-square box is not a circle.
            borderRadius: isQuiet ? 0 : height / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isQuiet ? 'transparent' : theme.colors.accent,
            opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          }}
        >
          <Glyph name={icon as never} size={isQuiet ? 23 : 19} color={isQuiet ? theme.colors.muted : theme.colors.onAccent} />
        </View>
      )}
    </Pressable>
  );
}
