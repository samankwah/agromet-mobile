import { useEffect, useMemo, useState } from 'react';

import type { WeatherAlert } from '../../../shared/domain/weatherAlert';
import { isCurrent, reachesBanner, synthesiseAlerts } from '../../../shared/domain/hazardAlerts';
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
 * Two filters, answering different questions. `isCurrent` asks whether the
 * alert is live — not lapsed, and past its lead edge; `reachesBanner` asks
 * whether it is loud enough to interrupt. An expired alert is dropped here
 * rather than inside `synthesiseAlerts` so that function stays clock-free.
 *
 * What reaches the banner is narrower than what `synthesiseAlerts` produces:
 * `reachesBanner` holds back a computed `watch` (hazard band moderate), which is
 * an ordinary state for much of the country in the rainy season, while letting
 * every issued bulletin through whatever its severity. Both surfaces that use
 * this hook render the single highest-severity alert in a banner, so gating here
 * rather than per-screen keeps Home and Advisories from disagreeing about what
 * the top alert is. The full set stays on Flood & Drought, which reads the
 * summary directly.
 *
 * The hand-rolled cache/fallback this hook used to carry is gone;
 * `useCachedQuery` generalised exactly that pattern, and its own docblock cites
 * this file as where it came from. The return shape is unchanged so
 * `AdvisoriesScreen` and `useHomeData` need no edit.
 */
export function useAlerts(districtIds: string[], enabled: boolean) {
  const query = useHazardSummary();

  // The clock, as state, so an alert can lapse while the screen sits open.
  //
  // Waiting for the next refetch was survivable when alerts stood for a day; at
  // ten minutes (`HAZARD_ALERT_VALIDITY_MINUTES`) it would mean the banner
  // outliving its own window most of the time, which is the exact complaint this
  // is answering.
  const [now, setNow] = useState(() => Date.now());

  const candidates = useMemo<WeatherAlert[]>(
    () => (enabled ? synthesiseAlerts(query.data, districtIds) : []),
    [query.data, districtIds, enabled],
  );

  const alerts = useMemo<WeatherAlert[]>(
    () => candidates.filter((alert) => isCurrent(alert, now) && reachesBanner(alert)),
    [candidates, now],
  );

  useEffect(() => {
    // One timer for the whole list, set to the soonest expiry rather than one
    // per alert. Capped at a minute so a long-dated bulletin cannot schedule a
    // delay past the 32-bit ceiling that silently fires immediately; the cost is
    // at most a minute of lateness on windows measured in hours, and none at all
    // on windows measured in minutes.
    const soonest = candidates
      .map((alert) => Date.parse(alert.expiresAt))
      .filter((time) => Number.isFinite(time) && time > now)
      .sort((a, b) => a - b)[0];
    if (soonest === undefined) return;

    // A small overshoot, so the timer never fires a millisecond early and
    // schedules itself again for the same instant.
    const delay = Math.min(soonest - now + 250, 60_000);
    const timer = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [candidates, now]);

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
