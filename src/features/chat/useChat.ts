import { useCallback, useMemo, useReducer } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useMutation } from '@tanstack/react-query';

import { sendChatMessage } from '../../shared/api/chatService';
import { NetworkError } from '../../shared/api/http';
import { ServiceError } from '../../shared/api/mockDelay';
import { HOME_LOCATIONS } from '../../shared/data/mockWeather';
import { MAX_HISTORY_TURNS, type ChatMessage, type ChatTurn } from '../../shared/domain/chat';
import { useLocationStore } from '../../shared/state/locationStore';
import { useSettingsStore } from '../../shared/state/settingsStore';
import { formatReplyText } from './formatReplyText';

/**
 * The chat screen's only source of state.
 *
 * A `useReducer` rather than several `useState`s because one send mutates three
 * things that must move together: append the question, remember which turn is
 * awaiting an answer, then either append the reply or mark that question
 * failed. Split across separate setters, a rejection could land after a retry
 * had already started and mark the wrong turn.
 *
 * Not a zustand store: every store in `shared/state` holds a preference or a
 * selection, and `locationStore`'s docblock draws that line explicitly. A
 * transcript is neither, and nothing outside this screen reads it — a global
 * store would buy a `hasHydrated` gate for no consumers.
 *
 * Not `useCachedQuery` either: that is a read-through offline cache for
 * idempotent GETs. Sending a question is a mutation, so the send itself is a
 * `useMutation`, following `farm-tools/diagnose/useDiagnose.ts`.
 *
 * The transcript does not survive a restart, and that is a decision. Chat
 * answers are conditioned on *now* ("plant next week", "rain on Thursday"), so
 * restoring them cold — with no `cachedAt` label of the kind `useCachedQuery`
 * shows precisely to stop this — would present last month's advice as current.
 * The backend holds no conversation either, so a restored transcript is only
 * real if we resend it, paying tokens and rural bandwidth for context the
 * farmer has moved on from. If durability is wanted later, the honest unit is a
 * per-answer "save this", not whole-transcript restore; `ChatMessage[]` is
 * already serialisable.
 */
type State = {
  messages: ChatMessage[];
  /** The question currently awaiting a reply, if any. */
  pendingId: string | null;
};

type Action =
  | { type: 'ask'; message: ChatMessage }
  | { type: 'answer'; id: string; reply: ChatMessage }
  | { type: 'fail'; id: string }
  | { type: 'retry'; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ask':
      return { messages: [...state.messages, action.message], pendingId: action.message.id };
    case 'answer':
      return { messages: [...state.messages, action.reply], pendingId: null };
    case 'fail':
      return {
        messages: state.messages.map((message) =>
          message.id === action.id ? { ...message, failed: true } : message,
        ),
        pendingId: null,
      };
    case 'retry':
      return {
        messages: state.messages.map((message) =>
          message.id === action.id ? { ...message, failed: false } : message,
        ),
        pendingId: action.id,
      };
  }
}

/** Ids only have to be unique within one session's transcript, and the app has
 * no uuid dependency — same approach as `authStore`'s guest id. */
function newId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The turns to replay, given the transcript up to (but not including) the
 * question being sent.
 *
 * Failed questions are excluded: they were never answered, so replaying one
 * would present the assistant with a question it appears to have ignored.
 */
function historyFor(messages: ChatMessage[], excludeId: string): ChatTurn[] {
  return messages
    .filter((message) => message.id !== excludeId && !message.failed)
    .slice(-MAX_HISTORY_TURNS)
    .map((message) => ({ role: message.role, content: message.text }));
}

export function describeChatError(error: unknown): string {
  // Branch on the class and the status, never the text — that is what
  // ServiceError carries `status` for.
  if (error instanceof NetworkError) return error.message;
  if (error instanceof ServiceError) {
    return error.status && error.status >= 500
      ? 'AgroMet AI is having trouble right now. Try again in a moment.'
      : error.message;
  }
  return 'Something went wrong. Try again.';
}

export function useChat() {
  const [state, dispatch] = useReducer(reducer, { messages: [], pendingId: null });

  const selectedLocationId = useLocationStore((store) => store.selectedLocationId);
  const favouriteCrops = useSettingsStore((store) => store.favouriteCrops);

  const userContext = useMemo(
    () => ({
      region: HOME_LOCATIONS.find((location) => location.id === selectedLocationId)?.region,
      crops: favouriteCrops.length > 0 ? favouriteCrops : undefined,
    }),
    [selectedLocationId, favouriteCrops],
  );

  const mutation = useMutation({
    mutationFn: sendChatMessage,
    // Explicit even though mutations already default to no retries: silently
    // retrying a 35-second request twice is a hundred-second hang with nothing
    // on screen to explain it.
    retry: 0,
  });

  const run = useCallback(
    (id: string, text: string, history: ChatTurn[]) => {
      mutation.mutate(
        { message: text, history, userContext },
        {
          onSuccess: (reply) => {
            const formatted = formatReplyText(reply);
            dispatch({
              type: 'answer',
              id,
              reply: { id: newId(), role: 'assistant', text: formatted, at: new Date().toISOString() },
            });
            // Announced here rather than from a render effect so it fires once
            // per reply. TalkBack will not move focus into the new bubble on
            // its own, and the reply is the whole point of the screen.
            AccessibilityInfo.announceForAccessibility(formatted);
          },
          onError: () => dispatch({ type: 'fail', id }),
        },
      );
    },
    [mutation, userContext],
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || state.pendingId) return;

      const message: ChatMessage = {
        id: newId(),
        role: 'user',
        text: trimmed,
        at: new Date().toISOString(),
      };

      dispatch({ type: 'ask', message });
      run(message.id, trimmed, historyFor(state.messages, message.id));
    },
    [run, state.messages, state.pendingId],
  );

  const retry = useCallback(
    (id: string) => {
      const message = state.messages.find((entry) => entry.id === id);
      if (!message || state.pendingId) return;

      dispatch({ type: 'retry', id });
      run(id, message.text, historyFor(state.messages, id));
    },
    [run, state.messages, state.pendingId],
  );

  return {
    messages: state.messages,
    isSending: state.pendingId !== null,
    error: mutation.error,
    send,
    retry,
    /** The farmer's selected region, so the composer can offer it as the
     * "location" attachment rather than resolving the town a second time. */
    region: userContext.region,
  };
}
