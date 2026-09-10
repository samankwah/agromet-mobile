import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Share, View } from 'react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { OptionSheet, type SheetOption } from '../../../shared/ui/OptionSheet';
import type { ChatMessage } from '../../../shared/domain/chat';
import { dayLabel, startsNewDay } from '../dayLabel';
import { toPlainText } from '../richText';
import { DateSeparator } from './DateSeparator';
import { MessageBubble, type BubbleState } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

type Row =
  | { key: string; kind: 'typing' }
  | { key: string; kind: 'date'; label: string }
  | { key: string; kind: 'message'; message: ChatMessage; isFirstInGroup: boolean; state: BubbleState };

type Props = {
  messages: ChatMessage[];
  isSending: boolean;
  onRetry: (id: string) => void;
  /** Reads one reply aloud. Absent when the device already has a screen reader
   * speaking the transcript. */
  onToggleSpeech?: (id: string, text: string) => void;
  speakingId?: string | null;
};

/**
 * The transcript.
 *
 * `inverted`, over a reversed row list. That makes bottom-anchoring free: new
 * content stays pinned without an `onContentSizeChange` → `scrollToEnd` round
 * trip, which is the pairing that races the keyboard animation and leaves the
 * newest reply half off screen.
 *
 * Two consequences of `inverted` worth knowing. The pending indicator is row
 * *zero*, because zero is what renders at the bottom. And a
 * `ListHeaderComponent` would appear at the bottom too, which is why the
 * conversation's header lives outside this list.
 *
 * Rows are grouped and dated *before* the reverse, so every decision — "is this
 * the first of a run", "does a new day start here" — is made in reading order
 * against the message that actually precedes it. Doing it after the reverse is
 * the classic way to end up with tails on the wrong bubble.
 *
 * Spacing rides on each row rather than a container `gap`: a run by one speaker
 * closes up, a change of speaker opens out, and a date separator gets more room
 * still. That rhythm is most of what makes a transcript scannable, and a
 * uniform gap throws it away. (Inside a cell the list's flip is applied twice
 * and cancels, so `marginTop` here is the visual top.)
 */
export function MessageList({ messages, isSending, onRetry, onToggleSpeech, speakingId }: Props) {
  const theme = useTheme();

  // One sheet for the whole list, not one per bubble: a modal mounted inside
  // every cell of a recycling list is a modal per turn, and this transcript can
  // run to a couple of hundred.
  const [actionsFor, setActionsFor] = useState<ChatMessage | null>(null);

  const actions = useMemo<SheetOption[]>(() => {
    if (!actionsFor) return [];
    const options: SheetOption[] = [{ id: 'share', label: 'Share this answer' }];
    if (onToggleSpeech && actionsFor.role === 'assistant' && !actionsFor.failed) {
      options.unshift({
        id: 'speak',
        label: speakingId === actionsFor.id ? 'Stop reading aloud' : 'Read aloud',
      });
    }
    return options;
  }, [actionsFor, onToggleSpeech, speakingId]);

  const runAction = useCallback(
    (id: string) => {
      const message = actionsFor;
      setActionsFor(null);
      if (!message) return;

      if (id === 'speak') {
        onToggleSpeech?.(message.id, toPlainText(message.text));
        return;
      }

      // React Native's own share sheet, so this needs no native module and no
      // new build. Sharing the words is the point: an answer about a spray
      // window is worth forwarding to whoever else is farming that plot.
      void Share.share({ message: toPlainText(message.text) }).catch(() => {
        // A dismissed or unavailable share sheet is not an error worth a
        // banner. The farmer still has the answer on screen.
      });
    },
    [actionsFor, onToggleSpeech],
  );

  const rows = useMemo<Row[]>(() => {
    const chronological: Row[] = [];

    messages.forEach((message, index) => {
      const previous = messages[index - 1];
      const newDay = startsNewDay(message.at, previous?.at);

      if (newDay) {
        chronological.push({ key: `date-${message.id}`, kind: 'date', label: dayLabel(message.at) });
      }

      const state: BubbleState = message.failed
        ? 'failed'
        : // The last message is awaiting a reply only while a send is in flight;
          // once the answer lands it is no longer the last.
          isSending && index === messages.length - 1
          ? 'pending'
          : 'sent';

      chronological.push({
        key: message.id,
        kind: 'message',
        message,
        isFirstInGroup: newDay || !previous || previous.role !== message.role,
        state,
      });
    });

    const reversed = chronological.slice().reverse();
    return isSending ? [{ key: 'typing', kind: 'typing' }, ...reversed] : reversed;
  }, [messages, isSending]);

  return (
    <>
      <FlatList
        inverted
        data={rows}
        keyExtractor={(row) => row.key}
        // No tab-bar clearance: the composer is a real flex sibling below this
        // list and reserves its own room. Adding it in both places floats the
        // newest message a bar's height off the bottom.
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}
        // So Try again, or a suggestion, lands on the first press with the
        // keyboard up — matching Screen's own scroll container.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        // TalkBack reads new replies as they arrive on Android; iOS gets the
        // explicit announcement from useChat.
        accessibilityLiveRegion="polite"
        // A day's conversation can run to a couple of hundred rows, and the
        // phone this is built for is not fast. Rendering a screenful at a time
        // keeps the first paint cheap; the window either side of it is what
        // stops a fast scroll showing blank cells. No `getItemLayout`: bubbles
        // are variable height and guessing one would be worse than measuring.
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        renderItem={({ item }) => {
          if (item.kind === 'typing') {
            return (
              <View style={{ marginTop: theme.spacing.xs }}>
                <TypingIndicator />
              </View>
            );
          }

          if (item.kind === 'date') {
            return (
              <View style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.xs }}>
                <DateSeparator label={item.label} />
              </View>
            );
          }

          return (
            <View style={{ marginTop: item.isFirstInGroup ? theme.spacing.md : theme.spacing.xs }}>
              <MessageBubble
                message={item.message}
                state={item.state}
                isFirstInGroup={item.isFirstInGroup}
                errorMessage={item.message.errorText}
                onRetry={() => onRetry(item.message.id)}
                retryDisabled={isSending}
                // Only finished answers: reading the farmer's own words back, or
                // speaking a reply that failed to arrive, would be noise.
                onToggleSpeech={
                  onToggleSpeech && item.message.role === 'assistant' && item.state !== 'failed'
                    ? () => onToggleSpeech(item.message.id, item.message.text)
                    : undefined
                }
                isSpeaking={speakingId === item.message.id}
                onLongPress={() => setActionsFor(item.message)}
              />
            </View>
          );
        }}
      />

      <OptionSheet
        visible={actionsFor !== null}
        options={actions}
        selectedId=""
        onSelect={runAction}
        onClose={() => setActionsFor(null)}
        title="This message"
      />
    </>
  );
}
