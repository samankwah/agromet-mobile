import { listArchivedAdvisories } from '../../../shared/api/weeklyAdvisoryService';
import { useCachedQuery } from '../../../shared/api/useCachedQuery';

const HOUR = 60 * 60 * 1000;
const ARCHIVE_STALE_TIME = 6 * HOUR;
const ARCHIVE_GC_TIME = 7 * 24 * HOUR;

/**
 * Every published advisory, fetched once.
 *
 * The filters are deliberately **not** part of the query key. The whole set
 * comes back in one request and the screen narrows it in memory, so a dropdown
 * change must not invalidate the cache or refetch — that is the rule
 * CalendarListScreen and MarketScreen both follow, and it is also what lets the
 * archive keep working with no signal.
 *
 * An advisory is published rarely, so a six-hour stale window costs nothing and
 * a week of retention means a farmer who opens the app offline still has the
 * archive they had yesterday.
 */
export function useAdvisoryArchive() {
  const query = useCachedQuery({
    queryKey: ['advisory-archive'],
    queryFn: listArchivedAdvisories,
    cacheKey: 'advisory-archive',
    staleTime: ARCHIVE_STALE_TIME,
    gcTime: ARCHIVE_GC_TIME,
  });

  return {
    ...query,
    entries: query.data?.data ?? [],
    /**
     * `'empty'` — nothing has ever been published, so the rows on screen are
     * the bundled samples. `'offline'` — the server was unreachable, likewise.
     * `null` — these are real records. The screen says something different for
     * each, because "nobody has published anything" and "your phone has no
     * signal" are not the same news.
     */
    fallback: query.data?.fallback ?? null,
  };
}
