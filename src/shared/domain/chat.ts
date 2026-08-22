export type ChatRole = 'user' | 'assistant';

/**
 * One turn as it appears in the transcript.
 *
 * `id` is generated on the client because `/api/chat` is stateless — it returns
 * a reply and nothing else, no message id and no conversation id. `failed`
 * marks a question whose send never landed; it is what the inline retry hangs
 * off, and it is why a turn can exist in the transcript without a partner.
 */
export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  at: string;
  failed?: boolean;
};

/**
 * One prior turn, in the shape the backend's `conversationHistory` expects.
 *
 * The backend types that field as a bare `list[dict]`, so this shape is the
 * app's to define. `{ role, content }` is chosen because it maps one-to-one
 * onto the items `build_chat_input` assembles for OpenAI — anything else would
 * be silently dropped by its role/content filter.
 */
export type ChatTurn = { role: ChatRole; content: string };

/**
 * What the assistant is told about who is asking.
 *
 * The backend reads only `region` today (it interpolates it into the reply it
 * serves when no provider key is configured), but the field is a free-form dict
 * and the web client sends a similar shape, so `crops` costs nothing now and is
 * already there when the system prompt starts using it.
 */
export type ChatUserContext = {
  region?: string;
  crops?: string[];
};

/** How many prior turns to send. Mirrors the backend's own CHAT_HISTORY_LIMIT:
 * the server cap is the real control (the endpoint has no auth, so unbounded
 * history from any caller is an uncapped token spend), and this one keeps us
 * from paying rural bandwidth to send what the server will only discard. */
export const MAX_HISTORY_TURNS = 8;
