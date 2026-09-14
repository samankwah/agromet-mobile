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
  /** Set on a question asked about a photo, so the bubble can show what was
   * being asked about. The history sent upstream stays text only.
   *
   * It is also what tells a retry which endpoint to use: a photo question was
   * answered by `/api/image-analysis`, and resending it as text would ask
   * `/api/chat` about a picture it never saw. */
  imageUri?: string;
  /** Why this turn failed, in the farmer's words.
   *
   * On the message rather than on the screen because there is more than one
   * thing that can fail here, and they fail separately: a photo question runs
   * through a different endpoint from a typed one. A single screen-level error
   * meant a failed photo showed a dimmed bubble with no explanation at all,
   * while a stale error from an earlier typed question could attach itself to
   * a bubble it had nothing to do with. */
  errorText?: string;
  /** True when the server served its built-in fallback instead of a model
   * answer. Shown, because a farmer acting on generic advice while believing an
   * assistant read their question is the failure worth preventing. */
  degraded?: boolean;
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
 * All of it is now used. The backend puts the area and the crops into the DATA
 * block it builds for each question, and uses the region to look up that
 * area's forecast, its flood and drought bands, and its market prices. Before
 * that, `region` reached the model only by accident, inside the canned reply
 * served when no provider key was configured.
 */
export type ChatUserContext = {
  region?: string;
  /** The town selected on Home. Sent as the farmer's locality rather than as a
   * district, because it is a town, and the answer should not put them in a
   * district they did not choose. */
  town?: string;
  crops?: string[];
};

/** How many prior turns to send. Mirrors the backend's own CHAT_HISTORY_LIMIT:
 * the server cap is the real control (the endpoint has no auth, so unbounded
 * history from any caller is an uncapped token spend), and this one keeps us
 * from paying rural bandwidth to send what the server will only discard. */
export const MAX_HISTORY_TURNS = 8;
