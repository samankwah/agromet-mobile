import { listFaqs } from '../../shared/api/faqService';
import { useCachedQuery } from '../../shared/api/useCachedQuery';

const HOUR = 60 * 60 * 1000;

/**
 * The common questions and their answers.
 *
 * NOT DEAD CODE, though nothing imports it right now. The Library screen this
 * hook fed has been replaced by the AgroMet AI chat tab, and these answers are
 * deliberately held back for the planned Mobile Menu rather than folded into
 * the assistant's starter prompts — the chat teaches what *can* be asked, while
 * these are the four things the backend has actually published.
 *
 * The retained set is this hook, `components/FaqItem.tsx`,
 * `components/LibrarySkeleton.tsx`, `shared/api/faqService.ts` and
 * `shared/domain/faq.ts`. Neither `tsc --noEmit` nor eslint flags an unused
 * export, so this comment is the only thing standing between them and someone
 * garbage-collecting five working files. Their behaviour is covered by
 * `src/tests/api/faqService.test.ts`.
 *
 * A long stale window and a long retention, because the answers are static
 * prose that changes when the backend is redeployed, not with the weather.
 *
 * The offline cache earns its place here more than anywhere else in the app:
 * "when should I plant maize" is exactly the question a farmer has standing in
 * a field with no signal, and once these have been read they should stay read.
 */
export function useFaqs() {
  const query = useCachedQuery({
    queryKey: ['faq'],
    queryFn: listFaqs,
    cacheKey: 'faq',
    staleTime: 24 * HOUR,
    gcTime: 30 * 24 * HOUR,
  });

  return { ...query, faqs: query.data ?? [] };
}
