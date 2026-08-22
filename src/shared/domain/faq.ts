/**
 * Common questions, with answers published by the backend.
 *
 * The questions themselves are held here rather than fetched, because
 * `/api/faq/{topic}` answers one topic at a time and there is no index
 * endpoint — the server knows the answers, not the catalogue. So the slug and
 * the wording of each question are the app's, and only the prose is the
 * server's.
 *
 * Kept short and in a farmer's own words rather than the slug's. "maize-
 * fertilizer" is a key; "How much fertiliser does maize need?" is a question.
 */
export type FaqEntry = {
  /** The backend's topic key. */
  topic: string;
  question: string;
  answer: string;
};

/** The four topics `FAQ_MESSAGES` in `backend/app/main.py` publishes.
 *
 * Adding one here without adding it there yields a 404 for that row, which
 * `listFaqs` drops rather than showing a question with no answer. */
export const FAQ_TOPICS: { topic: string; question: string }[] = [
  { topic: 'when-to-plant-maize', question: 'When should I plant maize?' },
  { topic: 'when-to-plant-rice', question: 'When should I plant rice?' },
  { topic: 'maize-fertilizer', question: 'How much fertiliser does maize need?' },
  { topic: 'rainy-season-farming', question: 'How should I farm through the rainy season?' },
];
