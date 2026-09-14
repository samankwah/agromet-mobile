/**
 * What a farmer sees before they have asked anything.
 *
 * Hardcoded rather than drawn from `/api/faq`, even though four published
 * answers exist and `useFaqs` still reads them. Those four are reserved for the
 * retained FAQ layer, and a starter prompt has a different job anyway: it
 * teaches the range of what can be asked, so the list deliberately spans
 * planting, weather, pests and prices rather than clustering on one topic.
 *
 * Kept to four. A list taller than the keyboard stops reading as suggestions
 * and starts reading as a menu the farmer must choose from.
 */
export const STARTER_PROMPTS = [
  'When should I plant maize this season?',
  'Is the rain coming this week?',
  'Why are my tomato leaves curling?',
  'How do I store my harvest to avoid losses?',
] as const;

/**
 * The assistant's opening turn.
 *
 * Says what it can do and, in the same breath, what it needs to do it well.
 * That second half is not throat-clearing: the answer to "when should I plant?"
 * is a different date in Tamale and in Takoradi, and a farmer who names their
 * crop and their town in the first message gets a specific answer instead of a
 * paragraph about Ghana.
 */
export const CHAT_GREETING =
  "Ask me about planting, weather, pests or prices. I know Ghana's seasons, " +
  'but not your farm. Tell me your crop and your town and I can be specific.';
