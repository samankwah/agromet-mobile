import { FAQ_TOPICS, type FaqEntry } from '../domain/faq';
import { getJson } from './http';

/**
 * Answers to the common questions.
 *
 * One quirk to know about, because it is unique in this codebase: the FAQ
 * endpoint answers `{ success, message }` with **no `data` key**. `http.ts`'s
 * `unwrap()` only unwraps when `'data' in body`, so `getJson` hands back the
 * whole envelope here while every other service in the app receives the inner
 * payload. Hence `.message` below rather than a bare string.
 */
type FaqDto = { success?: boolean; message?: string };

/**
 * All four answers, fetched together.
 *
 * `Promise.all` rather than four sequential calls or four hooks: the screen
 * shows one list and should therefore have one loading state, not four rows
 * that resolve independently and shuffle the layout as they land.
 *
 * `allSettled`, not `all`, because a single missing topic should cost that one
 * row. The alternative — a 404 on one slug blanking the whole screen — would
 * make the list only as reliable as its least-maintained entry.
 */
export async function listFaqs(): Promise<FaqEntry[]> {
  const results = await Promise.allSettled(
    FAQ_TOPICS.map(({ topic }) => getJson<FaqDto>(`/api/faq/${encodeURIComponent(topic)}`)),
  );

  const entries = FAQ_TOPICS.map(({ topic, question }, index) => {
    const result = results[index];
    const answer = result.status === 'fulfilled' ? (result.value?.message ?? '') : '';
    return { topic, question, answer };
  })
    // A question with no answer is worse than no question: it looks like the
    // app lost the content. Drop it and show the rest.
    .filter((entry) => entry.answer.trim() !== '');

  // Nothing came back at all, so this is a failure and must be reported as
  // one. Returning [] would count as a success, and `useCachedQuery` writes
  // every success to the offline cache — quietly replacing answers a farmer
  // already had with nothing.
  if (entries.length === 0) {
    const failure = results.find((result) => result.status === 'rejected');
    throw failure && failure.status === 'rejected'
      ? failure.reason
      : new Error('No answers were published.');
  }

  return entries;
}
