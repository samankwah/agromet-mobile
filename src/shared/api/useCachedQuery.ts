import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { getCached, setCached } from '../storage/cache';
import { NetworkError } from './http';

/**
 * A query with a read-through offline cache.
 *
 * Generalised from the pattern written inline in
 * `features/advisories/weather-alerts/useAlerts.ts`, so every
 * network-backed feature behaves the same way:
 *
 *   success  → write the payload to AsyncStorage, render it
 *   error    → if the server was unreachable and something is cached,
 *              render that and report `success`, flagged as stale
 *   error    → otherwise report the error
 *
 * That last distinction is the one thing added here. `useAlerts` falls back
 * on *any* error; for calendars that would be wrong, because a 404 on a
 * deleted calendar would resurrect it from cache forever. Only an
 * unreachable server justifies showing stale data.
 */
export type CachedQueryResult<T> = {
  status: 'pending' | 'error' | 'success';
  error: unknown;
  data: T | undefined;
  /** True when what's on screen came from disk, not the network. */
  usingCachedFallback: boolean;
  cachedAt: string | undefined;
  isFetching: boolean;
  refetch: () => void;
};

export function useCachedQuery<T>(params: {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  /** AsyncStorage key. Must vary with everything `queryKey` varies with, or
   * a filter change will read back the previous filter's payload. */
  cacheKey: string;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}): CachedQueryResult<T> {
  const { queryKey, queryFn, cacheKey, enabled = true, staleTime, gcTime } = params;
  const queryClient = useQueryClient();
  const [fallback, setFallback] = useState<{ value: T; cachedAt: string } | null>(null);

  const query = useQuery({ queryKey, queryFn, enabled, staleTime, gcTime });

  useEffect(() => {
    if (query.status === 'success' && query.data !== undefined) {
      setCached(cacheKey, query.data);
    }
  }, [cacheKey, query.status, query.data]);

  useEffect(() => {
    // Deliberately never resets to null outside this branch — that would be
    // a synchronous setState in an effect body and can cascade renders. It
    // doesn't need to: every read below is gated on status === 'error'.
    if (query.status === 'error' && query.error instanceof NetworkError) {
      getCached<T>(cacheKey).then((cached) => {
        if (cached) setFallback({ value: cached.value, cachedAt: cached.cachedAt });
      });
    }
  }, [cacheKey, query.status, query.error]);

  const refetch = useCallback(() => {
    setFallback(null);
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const usingCachedFallback = query.status === 'error' && fallback !== null;

  return {
    status: usingCachedFallback ? 'success' : query.status,
    error: usingCachedFallback ? undefined : query.error,
    data: query.status === 'success' ? query.data : fallback?.value,
    usingCachedFallback,
    cachedAt: fallback?.cachedAt,
    isFetching: query.isFetching,
    refetch,
  };
}
