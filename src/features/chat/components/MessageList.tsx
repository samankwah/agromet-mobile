import React, { useMemo } from 'react';
import { FlatList, View } from 'react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import type { ChatMessage } from '../../../shared/domain/chat';
import { dayLabel, startsNewDay } from '../dayLabel';
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
  errorMessage?: string;
  onRetry: (id: string) => void;
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
export function MessageList({ messages, isSending, errorMessage, onRetry }: Props) {
  const theme = useTheme();

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
              errorMessage={errorMessage}
              onRetry={() => onRetry(item.message.id)}
              retryDisabled={isSending}
            />
          </View>
        );
      }}
    />
  );
}
