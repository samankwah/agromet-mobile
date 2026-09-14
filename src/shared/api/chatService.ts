import type { ChatTurn, ChatUserContext } from '../domain/chat';
import { useAuthStore } from '../state/authStore';
import { postJson } from './http';
import { ServiceError } from './mockDelay';

/**
 * The AgroMet AI assistant.
 *
 * Three things about this endpoint are worth knowing before changing anything
 * here.
 *
 * First, the envelope. `/api/chat` answers `{ success, message }` with **no
 * `data` key**, so `http.ts`'s `unwrap()` — which only unwraps when
 * `'data' in body` — hands back the whole envelope and we read `.message`.
 * `faqService.ts` has the same quirk and documents it as unique; it is not
 * unique any more, it is these two. If a third appears, the envelope handling
 * belongs in `http.ts`.
 *
 * Second, the budget. The server allows its model upstream 20 seconds and, on
 * any failure, answers with a plainly worded fallback instead of an error. So a
 * slow request is nearly always about to succeed with *something* useful, and
 * the client must not abort first — hence 25s rather than the shared 10s
 * default. It sits just outside the server's own budget, so the fallback beats
 * us to it and the farmer gets words rather than a timeout.
 *
 * Third, the device header. This endpoint has no login and spends money on
 * every call, so the server meters it per device. The id is the app's existing
 * persisted guest id, which is not an account and identifies nobody: it is
 * there so that one phone in a loop cannot spend the quota of a whole district
 * sharing its mobile address.
 */
type ChatReplyDto = {
  success?: boolean;
  message?: string;
  degraded?: boolean;
  degradedReason?: string;
};

/** The reply, and whether it actually came from the assistant.
 *
 * The server serves its built-in fallback with `success: true`, so on the wire
 * canned advice is indistinguishable from an answer that considered the
 * question. `degraded` is how the difference reaches the screen; `reason` is
 * for the logs and for anyone debugging why, and is never shown. */
export type ChatReply = { text: string; degraded: boolean; reason?: string };

const CHAT_TIMEOUT_MS = 25_000;

export async function sendChatMessage(input: { message: string; history: ChatTurn[]; userContext: ChatUserContext }): Promise<ChatReply> {
  const body = {
    message: input.message,
    conversationHistory: input.history,
    userContext: input.userContext,
  };

  const dto = await postJson<ChatReplyDto>('/api/chat', body, {
    timeoutMs: CHAT_TIMEOUT_MS,
    headers: { 'X-Device-Id': useAuthStore.getState().guestId },
  });

  const reply = dto?.message?.trim();

  // `faqService` tolerates a blank answer by dropping the row; a chat cannot —
  // an empty bubble looks like the app lost the reply. Checking `success` too
  // (which faqService does not) because a silent false here would otherwise
  // render as a perfectly normal-looking empty answer.
  if (dto?.success === false || !reply) {
    throw new ServiceError('AgroMet AI did not send a reply. Try again.');
  }

  return { text: reply, degraded: dto?.degraded === true, reason: dto?.degradedReason };
}
