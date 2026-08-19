import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getActiveAlerts } from '../../../shared/api/alertsService';
import type { WeatherAlert } from '../../../shared/domain/weatherAlert';
import { getCached, setCached } from '../../../shared/storage/cache';

const ALERTS_CACHE_KEY = 'alerts:last-success';

/**
 * Active alerts for the given saved-district ids, with a cache fallback:
 * on success the response is written to the last-success cache; on
 * failure, the cached payload (if any) is surfaced alongside the error so
 * the UI can show "Showing alerts saved <time>" instead of going blank.
 *
 * The saved-district *selection* itself now lives in
 * `shared/state/locationStore.ts` (Zustand) — this hook only queries with
 * whatever ids the caller passes in. The previous increment's
 * `useSavedDistricts()` hook (a local-state + AsyncStorage pair) is
 * retired; the store replaces it directly.
 */
export function useAlerts(districtIds: string[], enabled: boolean) {
  const queryClient = useQueryClient();
  const [cachedFallback, setCachedFallback] = useState<{ alerts: WeatherAlert[]; cachedAt: string } | null>(null);

  const query = useQuery({
    queryKey: ['alerts', districtIds],
    queryFn: () => getActiveAlerts(districtIds),
    enabled,
  });

  useEffect(() => {
    if (query.status === 'success') {
      setCached(ALERTS_CACHE_KEY, query.data);
    }
  }, [query.status, query.data]);

  useEffect(() => {
    // Only fetches the fallback on error — deliberately doesn't reset
    // cachedFallback back to null when status isn't 'error' (that would be
    // a synchronous setState in an effect body, which can cause cascading
    // renders). It doesn't need to: every read of cachedFallback below is
    // already gated on `query.status === 'error'`, so a stale non-null
    // value sitting in state while status is 'success' is simply unused —
    // and while status is 'pending' during a refetch, showing the last
    // cached alerts instead of nothing is the better UX anyway.
    if (query.status === 'error') {
      getCached<WeatherAlert[]>(ALERTS_CACHE_KEY).then((cached) => {
        if (cached) setCachedFallback({ alerts: cached.value, cachedAt: cached.cachedAt });
      });
    }
  }, [query.status]);

  const refetch = useCallback(() => {
    setCachedFallback(null);
    return queryClient.invalidateQueries({ queryKey: ['alerts', districtIds] });
  }, [queryClient, districtIds]);

  // A cache hit on failure counts as "success" for rendering purposes — the
  // banner shows the (stale) alert content plus a "showing saved" note,
  // rather than an error state the farmer can't act on.
  const usingCachedFallback = query.status === 'error' && cachedFallback !== null;
  const status: 'pending' | 'error' | 'success' = usingCachedFallback ? 'success' : query.status;

  return {
    status,
    error: query.error,
    alerts: query.status === 'success' ? query.data : (cachedFallback?.alerts ?? []),
    usingCachedFallback,
    cachedAt: cachedFallback?.cachedAt,
    refetch,
  };
}
