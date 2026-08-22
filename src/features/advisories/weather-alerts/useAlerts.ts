import { useMemo } from 'react';

import type { WeatherAlert } from '../../../shared/domain/weatherAlert';
import { synthesiseAlerts } from '../../../shared/domain/hazardAlerts';
import { useHazardSummary } from '../flood-drought/useHazards';

/**
 * Active alerts for the given saved-district ids.
 *
 * Alerts used to come from two hardcoded fixtures. They are now derived from
 * the live flood/drought index: the same national summary the monitor screen
 * renders, filtered to the reader's regions and reduced to the readings severe
 * enough to be worth raising (moderate and above — see `hazardAlerts.ts`).
 *
 * Because it shares `useHazardSummary`'s query key, this costs no extra request
 * on a screen that already shows hazard data, and it inherits that hook's
 * offline cache — so alerts now survive a cold start without signal, which the
 * fixtures never had to.
 *
 * The hand-rolled cache/fallback this hook used to carry is gone;
 * `useCachedQuery` generalised exactly that pattern, and its own docblock cites
 * this file as where it came from. The return shape is unchanged so
 * `AdvisoriesScreen` and `useHomeData` need no edit.
 */
export function useAlerts(districtIds: string[], enabled: boolean) {
  const query = useHazardSummary();

  const alerts = useMemo<WeatherAlert[]>(
    () => (enabled ? synthesiseAlerts(query.data, districtIds) : []),
    [query.data, districtIds, enabled],
  );

  return {
    // Before the saved-district selection has rehydrated there is nothing
    // meaningful to show, and reporting `success` with an empty list would
    // flash "no active alerts" at a reader who does have some.
    status: enabled ? query.status : ('pending' as const),
    error: query.error,
    alerts,
    usingCachedFallback: query.usingCachedFallback,
    cachedAt: query.cachedAt,
    refetch: query.refetch,
  };
}
