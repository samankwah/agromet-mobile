import type { ChatTurn, ChatUserContext } from '../domain/chat';
import { postJson } from './http';
import { ServiceError } from './mockDelay';

/**
 * The AgroMet AI assistant.
 *
 * Two things about this endpoint are worth knowing before changing anything
 * here.
 *
 * First, the envelope. `/api/chat` answers `{ success, message }` with **no
 * `data` key**, so `http.ts`'s `unwrap()` — which only unwraps when
 * `'data' in body` — hands back the whole envelope and we read `.message`.
 * `faqService.ts` has the same quirk and documents it as unique; it is not
 * unique any more, it is these two. If a third appears, the envelope handling
 * belongs in `http.ts`.
 *
 * Second, the budget. The backend allows its OpenAI upstream 30 seconds and,
 * on any failure, answers with a canned regional fallback instead of an error.
 * So a slow request is nearly always about to succeed with *something* useful,
 * and the client must not abort first — hence 35s rather than the shared
 * 10s default.
 */
type ChatReplyDto = { success?: boolean; message?: string };

const CHAT_TIMEOUT_MS = 35_000;

export async function sendChatMessage(input: {
  message: string;
  history: ChatTurn[];
  userContext: ChatUserContext;
}): Promise<string> {
  const body = {
    message: input.message,
    conversationHistory: input.history,
    userContext: input.userContext,
  };

  const dto = await postJson<ChatReplyDto>('/api/chat', body, { timeoutMs: CHAT_TIMEOUT_MS });

  const reply = dto?.message?.trim();

  // `faqService` tolerates a blank answer by dropping the row; a chat cannot —
  // an empty bubble looks like the app lost the reply. Checking `success` too
  // (which faqService does not) because a silent false here would otherwise
  // render as a perfectly normal-looking empty answer.
  if (dto?.success === false || !reply) {
    throw new ServiceError('AgroMet AI did not send a reply. Try again.');
  }

  return reply;
}
