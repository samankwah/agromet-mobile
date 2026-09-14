import { fetchLegalDocument } from '../../shared/api/legalService';
import { useCachedQuery } from '../../shared/api/useCachedQuery';
import type { LegalSlug } from '../../shared/domain/legal';

const HOUR = 60 * 60 * 1000;

/**
 * One legal document, cached for offline reading.
 *
 * The same long stale window and long retention as `useFaqs`, and for the same
 * reason: this is static published prose that changes when the backend is
 * redeployed, not with the weather.
 *
 * The offline cache matters more here than almost anywhere else in the app. A
 * farmer who wants to know what the app does with their location data should
 * not need a signal to find out, and terms that are only readable online are
 * effectively unreadable on a rural connection.
 */
export function useLegalDocument(slug: LegalSlug) {
  const query = useCachedQuery({
    queryKey: ['legal', slug],
    queryFn: () => fetchLegalDocument(slug),
    cacheKey: `legal:${slug}`,
    staleTime: 24 * HOUR,
    gcTime: 30 * 24 * HOUR,
  });

  return { ...query, document: query.data };
}
