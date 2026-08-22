import { useMemo } from 'react';

import { getHazardMethodology, getHazardRegion, getHazardSummary } from '../../../shared/api/hazardsService';
import { useCachedQuery } from '../../../shared/api/useCachedQuery';
import type { HazardKind, HazardRegion } from '../../../shared/domain/hazard';
import { compareBandDesc } from '../../../shared/domain/hazardBand';

const HOUR = 60 * 60 * 1000;

/**
 * The backend recomputes a few times a day at most, so a short stale window
 * would only spend requests redrawing identical numbers. A day of garbage-
 * collection keeps a reading available offline for a farmer who opens the app
 * without signal.
 */
const HAZARD_STALE_TIME = 30 * 60 * 1000;
const HAZARD_GC_TIME = 7 * 24 * HOUR;

/**
 * National flood and drought summary for all sixteen regions.
 *
 * One query key for the whole app. The overview screen, the region screen and
 * the alerts banner all call this; TanStack dedupes on the key, so that is one
 * request and one cache entry rather than three.
 *
 * The "no reading available" case does not appear here as a flag — the service
 * rejects it, so it arrives as an ordinary error with a farmer-readable message
 * and AsyncStateView renders it with a Retry. See hazardsService for why that
 * matters to the offline cache.
 */
export function useHazardSummary() {
  const query = useCachedQuery({
    queryKey: ['hazards', 'summary'],
    queryFn: getHazardSummary,
    cacheKey: 'hazards:summary',
    staleTime: HAZARD_STALE_TIME,
    gcTime: HAZARD_GC_TIME,
  });

  return {
    ...query,
    regions: query.data?.regions ?? [],
    national: query.data?.national ?? null,
    computedAt: query.data?.computedAt ?? null,
    baseline: query.data?.baseline ?? null,
    sources: query.data?.sources ?? [],
    /** True when the server itself says its reading is past its refresh window,
     * which is a different thing from `usingCachedFallback` (we could not reach
     * the server at all). Both can be true at once. */
    serverStale: Boolean(query.data?.stale),
  };
}

/** The regions ranked worst-first for one hazard.
 *
 * Ties break on region name so rows keep a stable order between refreshes —
 * without it a reader watches the list reshuffle for no visible reason. */
export function useRankedRegions(regions: HazardRegion[], hazard: HazardKind) {
  return useMemo(
    () =>
      [...regions].sort((a, b) => {
        const byBand = compareBandDesc(a[hazard].band, b[hazard].band);
        if (byBand !== 0) return byBand;
        const byScore = (b[hazard].score ?? -1) - (a[hazard].score ?? -1);
        if (byScore !== 0) return byScore;
        return a.region.localeCompare(b.region);
      }),
    [regions, hazard],
  );
}

/**
 * One region in full, including the daily series the charts need.
 *
 * A 404 (unknown region) and a 503 (snapshot still cold) both arrive as
 * ServiceError, so `useCachedQuery` surfaces them as errors with a retry rather
 * than resurrecting stale data — which is what we want: a cold snapshot is
 * worth waiting a moment for, not papering over.
 */
export function useHazardRegion(region: string | null | undefined) {
  return useCachedQuery({
    queryKey: ['hazards', 'region', region],
    queryFn: () => getHazardRegion(region as string),
    // The region MUST be in the cache key. Sharing one key across regions would
    // hand a reader the previous region's numbers under this region's name.
    cacheKey: `hazards:region:${region ?? 'none'}`,
    enabled: Boolean(region),
    staleTime: HAZARD_STALE_TIME,
    gcTime: HAZARD_GC_TIME,
  });
}

export function useHazardMethodology() {
  return useCachedQuery({
    queryKey: ['hazards', 'methodology'],
    queryFn: getHazardMethodology,
    cacheKey: 'hazards:methodology',
    // Method and caveats change only when the backend is redeployed.
    staleTime: 24 * HOUR,
    gcTime: 30 * 24 * HOUR,
  });
}
