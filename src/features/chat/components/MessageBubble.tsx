import React from 'react';
import { Image, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Text } from '../../../shared/ui/Text';
import { formatTime } from '../../../shared/utils/dates';
import type { ChatMessage } from '../../../shared/domain/chat';
import { toPlainText } from '../richText';
import { RichText } from './RichText';

export type BubbleState = 'pending' | 'sent' | 'failed';

type Props = {
  message: ChatMessage;
  state: BubbleState;
  /** Only the first bubble of a run by one speaker wears the tail. */
  isFirstInGroup: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  /** Reads this reply aloud. Omitted for the farmer's own messages, and while a
   * screen reader is running, which already speaks the screen. */
  onToggleSpeech?: () => void;
  isSpeaking?: boolean;
  retryDisabled?: boolean;
  /** Opens the actions for this turn. Held rather than tapped, because a tap
   * inside a transcript should do nothing: there is no detail view to open, and
   * a bubble that reacts to a stray touch feels broken. */
  onLongPress?: () => void;
};

const RADIUS = 10;
const TAIL = 8;

/**
 * One turn in the transcript, in the messaging idiom.
 *
 * Three details do the work, and all three are worth keeping:
 *
 *   - **The tail**, on the first bubble of each run only. A tail on every
 *     bubble makes a run of three look like three separate interruptions;
 *     tailing just the first is what groups them into one utterance.
 *   - **The timestamp inside the bubble**, bottom-right, sharing the last line
 *     of text when there is room for it. A time in the margin costs a column of
 *     width on a 360dp screen and reads as metadata; a time inside the bubble
 *     reads as part of the message.
 *   - **A delivery mark** on outgoing turns. Not decoration: `/api/chat` is
 *     stateless and slow, so "did that send?" is a real question, and the tick
 *     answers it without a banner.
 *
 * Deliberately still not the shared `Card`. Card paints a chamfered SVG
 * silhouette that cannot be drawn until `onLayout` reports a size, so down a
 * recycling list every bubble would visibly pop from its fallback shape to its
 * real one. The rounded radius here is also the correct one by the design
 * system's own rule — `tokens.ts` assigns that tier to blocks nested inside a
 * surface, which is what a bubble on a wallpaper is.
 */
export function MessageBubble({
  message,
  state,
  isFirstInGroup,
  errorMessage,
  onRetry,
  retryDisabled,
  onToggleSpeech,
  isSpeaking,
  onLongPress,
}: Props) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  // The farmer's own words are exactly as typed; only a reply can carry the
  // light structure the assistant is asked for.
  const spoken = isUser ? message.text : toPlainText(message.text);

  const fill = isUser ? theme.colors.bubbleOut : theme.colors.bubbleIn;

  // The tailed corner is squared off so the tail grows out of a straight edge
  // rather than out of the middle of a curve.
  const corners = isFirstInGroup ? (isUser ? { borderTopRightRadius: 0 } : { borderTopLeftRadius: 0 }) : null;

  return (
    <View style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '84%' }}>
      <View>
        {isFirstInGroup ? (
          <Svg
            width={TAIL}
            height={TAIL}
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, [isUser ? 'right' : 'left']: -TAIL + 1 }}
          >
            {/* A right triangle filling the corner the squared edge left open. */}
            <Path d={isUser ? `M0 0 H${TAIL} L0 ${TAIL} Z` : `M${TAIL} 0 H0 L${TAIL} ${TAIL} Z`} fill={fill} />
          </Svg>
        ) : null}

        <Pressable
          accessible
          accessibilityLabel={`${isUser ? 'You' : 'AgroMet AI'}: ${spoken}`}
          accessibilityRole={onLongPress ? 'button' : undefined}
          accessibilityHint={onLongPress ? 'Hold for options' : undefined}
          onLongPress={onLongPress}
          delayLongPress={350}
          style={{
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            borderRadius: RADIUS,
            ...corners,
            backgroundColor: fill,
            // A shallow lift only. A bubble is small and there are dozens on
            // screen, so anything deeper turns the transcript into noise, and
            // the tail below is a separate Svg that casts nothing.
            boxShadow: theme.raised('sm'),
            opacity: state === 'failed' ? 0.75 : 1,
            // The text and the time share the last line when it fits, and the
            // time drops to its own line when it does not — which is what
            // flexWrap buys, without measuring anything.
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            columnGap: theme.spacing.sm,
          }}
        >
          {/* Above the words, because the photo is what the question is
              about. Full width of the bubble so a leaf is actually legible. */}
          {message.imageUri ? (
            <Image
              source={{ uri: message.imageUri }}
              style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: theme.radii.sm, marginBottom: theme.spacing.xs }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}

          {isUser ? (
            <Text variant="body" style={{ flexShrink: 1 }}>
              {message.text}
            </Text>
          ) : (
            <RichText text={message.text} />
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
            {/* Inside the bubble, beside the timestamp, so it belongs to this
                reply rather than floating between two of them. */}
            {onToggleSpeech ? (
              <Pressable
                onPress={onToggleSpeech}
                accessibilityRole="button"
                accessibilityLabel={isSpeaking ? 'Stop reading this answer' : 'Read this answer aloud'}
                hitSlop={12}
              >
                {/* Chrome on the nested View: Android drops a Pressable's own. */}
                <View style={{ paddingRight: theme.spacing.xs }}>
                  <Ionicons
                    name={isSpeaking ? 'stop-circle' : 'volume-medium-outline'}
                    size={16}
                    color={isSpeaking ? theme.colors.accent : theme.colors.muted}
                  />
                </View>
              </Pressable>
            ) : null}
            <Text variant="caption" muted>
              {formatTime(new Date(message.at))}
            </Text>
            {isUser ? <DeliveryMark state={state} /> : null}
          </View>
        </Pressable>
      </View>

      {/* Quietly said, not alarming. The advice is still worth reading; what
          the farmer must not do is act on it believing the assistant looked at
          their question. */}
      {message.degraded ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
          <Ionicons name="information-circle-outline" size={13} color={theme.colors.muted} />
          <Text variant="caption" muted style={{ flexShrink: 1 }}>
            General guidance. AgroMet AI is not fully set up on this server.
          </Text>
        </View>
      ) : null}

      {state === 'failed' && errorMessage ? (
        // Attached to the turn that failed rather than shown as a screen-level
        // banner: the transcript is the context for what broke.
        <View style={{ alignItems: 'flex-end', gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
          <Text variant="caption" color={theme.colors.danger}>
            {errorMessage}
          </Text>
          {onRetry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Try again"
              accessibilityState={{ disabled: Boolean(retryDisabled) }}
              disabled={retryDisabled}
              onPress={onRetry}
              hitSlop={theme.spacing.sm}
            >
              {({ pressed }) => (
                // Chrome on a nested View, never on the Pressable — Android
                // drops a Pressable's own background while still drawing its
                // children. Same reason Button and FaqItem do this.
                <View
                  style={{
                    minHeight: theme.minTouchTarget,
                    justifyContent: 'center',
                    paddingHorizontal: theme.spacing.md,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.colors.accent,
                    opacity: retryDisabled ? 0.6 : pressed ? 0.85 : 1,
                  }}
                >
                  <Text variant="bodyStrong" color={theme.colors.accent}>
                    Try again
                  </Text>
                </View>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Clock while in flight, tick once answered, warning when it did not land. */
function DeliveryMark({ state }: { state: BubbleState }) {
  const theme = useTheme();

  if (state === 'pending') {
    return <Ionicons name="time-outline" size={13} color={theme.colors.muted} />;
  }
  if (state === 'failed') {
    return <Ionicons name="alert-circle-outline" size={13} color={theme.colors.danger} />;
  }
  return <Ionicons name="checkmark-done" size={14} color={theme.colors.muted} />;
}
