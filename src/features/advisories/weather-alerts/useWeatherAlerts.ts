import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getWeeklyForecast } from '../../../shared/api/forecastService';
import { DEFAULT_LOCATION_ID } from '../../../shared/data/mockWeather';
import { isCurrent } from '../../../shared/domain/hazardAlerts';
import type { WeatherAlert } from '../../../shared/domain/weatherAlert';
import { useLocationStore } from '../../../shared/state/locationStore';

/**
 * The severe-weather alerts for a town, for the banner on Home and Advisories.
 *
 * They ride along on the weekly forecast (`WeeklyForecast.weatherAlerts`,
 * derived in `forecastService` from the same Open-Meteo bundle), so this shares
 * the `['weeklyForecast', locationId]` query with the Forecasts tab and Home's
 * forecast card — no extra request on any screen.
 *
 * Replaces `useAlerts`, which read the flood/drought hazard index. That index
 * still powers the Flood & Drought screen and `/alert/[id]`; it just no longer
 * lights the banner every day of the rainy season.
 */
export function useWeatherAlerts(locationId: string, enabled: boolean) {
  const query = useQuery({
    queryKey: ['weeklyForecast', locationId],
    queryFn: () => getWeeklyForecast(locationId),
    enabled,
  });

  // The clock, as state, so an alert can lapse while the screen sits open — the
  // same pattern the old `useAlerts` used. Today's alerts expire at day's end;
  // a storm alert with an `onset` also has a lead edge.
  const [now, setNow] = useState(() => Date.now());

  const candidates = useMemo<WeatherAlert[]>(
    () => (enabled ? (query.data?.weatherAlerts ?? []) : []),
    [query.data, enabled],
  );

  const alerts = useMemo<WeatherAlert[]>(
    () => candidates.filter((alert) => isCurrent(alert, now)),
    [candidates, now],
  );

  useEffect(() => {
    const soonest = candidates
      .map((alert) => Date.parse(alert.expiresAt))
      .filter((time) => Number.isFinite(time) && time > now)
      .sort((a, b) => a - b)[0];
    if (soonest === undefined) return;

    // Capped at a minute so a day-end expiry cannot schedule a timeout past the
    // 32-bit ceiling that silently fires immediately.
    const delay = Math.min(soonest - now + 250, 60_000);
    const timer = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [candidates, now]);

  // The banner shows a prompt only when it is stuck on the default town because
  // location was refused. A chosen town (carousel) or a detected one needs none.
  const locationPermission = useLocationStore((state) => state.locationPermission);
  const locationResolved = useLocationStore((state) => state.locationResolved);
  const townChoiceIsManual = useLocationStore((state) => state.townChoiceIsManual);
  const hasHydrated = useLocationStore((state) => state.hasHydrated);

  return {
    status: enabled ? query.status : ('pending' as const),
    error: query.error,
    alerts,
    refetch: query.refetch,
    locationPermission,
    locationPrompt:
      hasHydrated &&
      locationResolved &&
      locationPermission === 'denied' &&
      !townChoiceIsManual &&
      locationId === DEFAULT_LOCATION_ID,
  };
}
