import { clearCached, getCached, setCached } from './cache';
import type { ChatMessage } from '../domain/chat';

/**
 * The conversation, kept for a day.
 *
 * `useChat` used to argue against this, and the argument was a good one: chat
 * answers are conditioned on *now* ("plant next week", "rain on Thursday"), so
 * restoring a month-old transcript would present last season's advice as
 * current. But wiping it on every launch has its own cost, and it is the one a
 * farmer actually meets: close the app to check a photo, come back, and the
 * answer you were reading is gone.
 *
 * A day is where those two land. Within it the advice is still about the same
 * weather, and the transcript is worth having back; past it, it is not, and it
 * clears itself with nothing for anyone to remember to do. The restored turns
 * carry their original timestamps, so the transcript's own date separator dates
 * them on screen -- which is what stops yesterday evening's answer reading as
 * this morning's.
 *
 * Failed turns are dropped on the way out. A question that never reached the
 * server is not a conversation, and restoring one would offer a Try again
 * button for a send whose moment has passed.
 */
const KEY = 'chat-transcript';

/** Roughly a long day of conversation. Past this the oldest turns go, so a
 * chatty week cannot grow a JSON blob a low-end phone has to parse on launch. */
const MAX_MESSAGES = 200;

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function isWithinRetention(iso: string, now: number = Date.now()): boolean {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return false;
  // A timestamp in the future is a clock that has been changed, not a message
  // from tomorrow. Keeping it is the safer of the two mistakes: dropping it
  // would silently eat a conversation the farmer is still having.
  return at <= now + MAX_AGE_MS && now - at < MAX_AGE_MS;
}

export async function loadChatHistory(now: number = Date.now()): Promise<ChatMessage[]> {
  const cached = await getCached<ChatMessage[]>(KEY);
  const messages = cached?.value;
  if (!Array.isArray(messages)) return [];

  return messages.filter(
    (message) =>
      message &&
      typeof message.id === 'string' &&
      typeof message.text === 'string' &&
      typeof message.at === 'string' &&
      isWithinRetention(message.at, now),
  );
}

/**
 * The transcript worth restoring: whole exchanges, newest last.
 *
 * A question with no answer under it is dropped, whether it failed or was still
 * in flight when the app was closed. Restoring one would put a question on
 * screen that reads as ignored, with a Try again button for a send whose moment
 * has passed.
 */
export function settledMessages(messages: ChatMessage[]): ChatMessage[] {
  let lastAnswered = -1;
  messages.forEach((message, index) => {
    if (message.role === 'assistant' && !message.failed) lastAnswered = index;
  });

  return messages
    .slice(0, lastAnswered + 1)
    .filter((message) => !message.failed)
    .slice(-MAX_MESSAGES);
}

export async function saveChatHistory(messages: ChatMessage[]): Promise<void> {
  await setCached(KEY, settledMessages(messages));
}

export async function clearChatHistory(): Promise<void> {
  await clearCached(KEY);
}
