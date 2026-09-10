import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useMutation } from '@tanstack/react-query';

import { sendChatMessage } from '../../shared/api/chatService';
import { NetworkError } from '../../shared/api/http';
import { ServiceError } from '../../shared/api/mockDelay';
import { HOME_LOCATIONS } from '../../shared/data/mockWeather';
import { MAX_HISTORY_TURNS, type ChatMessage, type ChatTurn } from '../../shared/domain/chat';
import { useLocationStore } from '../../shared/state/locationStore';
import { useSettingsStore } from '../../shared/state/settingsStore';
import { askAboutPhoto } from '../../shared/api/imageQuestionService';
import { clearChatHistory, loadChatHistory, saveChatHistory } from '../../shared/storage/chatHistory';
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
 * The transcript now survives a restart for a day, through
 * `storage/chatHistory`. It deliberately does not survive longer: the objection
 * to restoring one at all was that chat answers are conditioned on *now*, and
 * a day is the window where that is still the same weather. Restored turns keep
 * their own timestamps, so the date separator dates them on screen rather than
 * letting yesterday's advice read as today's.
 */
type State = {
  messages: ChatMessage[];
  /** The question currently awaiting a reply, if any. */
  pendingId: string | null;
  /**
   * How the last settled turn went, or null before there has been one.
   *
   * The header used to report the phone's radio as the assistant's status, so
   * it said "online" with the server flat on its back. This is the other half
   * of that answer: the only proof a server is reachable is having reached it.
   */
  lastDelivery: 'ok' | 'failed' | null;
};

type Action =
  | { type: 'restore'; messages: ChatMessage[] }
  | { type: 'ask'; message: ChatMessage }
  | { type: 'answer'; id: string; reply: ChatMessage }
  | { type: 'fail'; id: string; errorText: string }
  | { type: 'retry'; id: string }
  | { type: 'clear' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'restore':
      // Only onto an empty transcript. Hydration is asynchronous, and a farmer
      // who opened the tab and started typing immediately must not have their
      // question shuffled in behind yesterday's.
      return state.messages.length > 0 ? state : { ...state, messages: action.messages };
    case 'ask':
      return { ...state, messages: [...state.messages, action.message], pendingId: action.message.id };
    case 'answer':
      return { ...state, messages: [...state.messages, action.reply], pendingId: null, lastDelivery: 'ok' };
    case 'fail':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.id ? { ...message, failed: true, errorText: action.errorText } : message,
        ),
        pendingId: null,
        lastDelivery: 'failed',
      };
    case 'retry':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.id ? { ...message, failed: false, errorText: undefined } : message,
        ),
        pendingId: action.id,
      };
    case 'clear':
      return { ...state, messages: [], pendingId: null };
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
    // 429 is the quota, and it is the one refusal where trying again straight
    // away is exactly the wrong move. The server sends words a farmer can act
    // on, so they are shown rather than replaced.
    if (error.status === 429) return error.message;
    return error.status && error.status >= 500 ? 'AgroMet AI is having trouble right now. Try again in a moment.' : error.message;
  }
  return 'Something went wrong. Try again.';
}

export function useChat() {
  const [state, dispatch] = useReducer(reducer, { messages: [], pendingId: null, lastDelivery: null });

  const selectedLocationId = useLocationStore((store) => store.selectedLocationId);
  const favouriteCrops = useSettingsStore((store) => store.favouriteCrops);

  const userContext = useMemo(() => {
    const location = HOME_LOCATIONS.find((entry) => entry.id === selectedLocationId);
    return {
      region: location?.region,
      town: location?.name,
      crops: favouriteCrops.length > 0 ? favouriteCrops : undefined,
    };
  }, [selectedLocationId, favouriteCrops]);

  // Yesterday's conversation, if it is still today's weather.
  useEffect(() => {
    let cancelled = false;
    loadChatHistory().then((messages) => {
      if (!cancelled && messages.length > 0) dispatch({ type: 'restore', messages });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Written after every settled turn rather than on every keystroke of state:
  // the transcript only changes when a turn lands, and a write per turn on a
  // low-end phone is nothing.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      if (state.messages.length === 0) return;
    }
    saveChatHistory(state.messages);
  }, [state.messages]);

  const mutation = useMutation({
    mutationFn: sendChatMessage,
    // Explicit even though mutations already default to no retries: silently
    // retrying a 25-second request twice is a minute-long hang with nothing
    // on screen to explain it.
    retry: 0,
  });

  const run = useCallback(
    (id: string, text: string, history: ChatTurn[]) => {
      mutation.mutate(
        { message: text, history, userContext },
        {
          onSuccess: (reply) => {
            const formatted = formatReplyText(reply.text);
            dispatch({
              type: 'answer',
              id,
              reply: {
                id: newId(),
                role: 'assistant',
                text: formatted,
                at: new Date().toISOString(),
                degraded: reply.degraded,
              },
            });
            // Announced here rather than from a render effect so it fires once
            // per reply. TalkBack will not move focus into the new bubble on
            // its own, and the reply is the whole point of the screen.
            AccessibilityInfo.announceForAccessibility(formatted);
          },
          onError: (error) => dispatch({ type: 'fail', id, errorText: describeChatError(error) }),
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

  /**
   * Ask about a photo already in the transcript, or newly added to it.
   *
   * Runs through `askAboutPhoto` rather than the chat mutation, because the
   * image goes to the analysis endpoint and `/api/chat` reads text only. The
   * answer joins the transcript as an ordinary assistant turn, so everything
   * downstream, read-aloud included, treats it the same as any other reply.
   */
  const runPhoto = useCallback(
    async (id: string, imageUri: string) => {
      try {
        const answer = await askAboutPhoto(imageUri, userContext.crops?.[0], userContext.region);
        const formatted = formatReplyText(answer);
        dispatch({
          type: 'answer',
          id,
          reply: { id: newId(), role: 'assistant', text: formatted, at: new Date().toISOString() },
        });
        AccessibilityInfo.announceForAccessibility(formatted);
      } catch (error) {
        // The reason, not just the fact. This path used to swallow the error
        // entirely, and the screen read its message off the *text* mutation —
        // so a failed photo question showed a dimmed bubble that never said
        // what went wrong or whether trying again was worth it.
        dispatch({ type: 'fail', id, errorText: describeChatError(error) });
      }
    },
    [userContext.crops, userContext.region],
  );

  const askPhoto = useCallback(
    async (imageUri: string) => {
      if (state.pendingId) return;

      const message: ChatMessage = {
        id: newId(),
        role: 'user',
        // The transcript is text, and the history sent upstream is text turns,
        // so the picture is described rather than embedded. `imageUri` carries
        // the photo itself for the bubble to show, and is what tells a retry to
        // come back through this path.
        text: 'What is wrong with this crop?',
        imageUri,
        at: new Date().toISOString(),
      };

      dispatch({ type: 'ask', message });
      await runPhoto(message.id, imageUri);
    },
    [runPhoto, state.pendingId],
  );

  const retry = useCallback(
    (id: string) => {
      const message = state.messages.find((entry) => entry.id === id);
      if (!message || state.pendingId) return;

      dispatch({ type: 'retry', id });

      // Back the way it came. A photo question answered by `/api/image-analysis`
      // was previously retried through `/api/chat`, which dropped the picture
      // and asked a text endpoint what was wrong with a crop it could not see —
      // so the retry could only ever fail differently.
      if (message.imageUri) {
        void runPhoto(id, message.imageUri);
        return;
      }

      run(id, message.text, historyFor(state.messages, id));
    },
    [run, runPhoto, state.messages, state.pendingId],
  );

  const clear = useCallback(() => {
    dispatch({ type: 'clear' });
    void clearChatHistory();
  }, []);

  return {
    messages: state.messages,
    isSending: state.pendingId !== null,
    /** Whether the assistant itself answered last time, as opposed to whether
     * the handset has a signal. Null until there is evidence either way. */
    serverReachable: state.lastDelivery === null ? null : state.lastDelivery === 'ok',
    send,
    askPhoto,
    retry,
    clear,
    /** The farmer's selected town and region, so the composer can offer them as
     * the "location" attachment rather than resolving the selection a second
     * time. */
    region: userContext.region,
    town: userContext.town,
  };
}
