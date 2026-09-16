import { useQuery } from '@tanstack/react-query';

import {
  getHourlyForecast,
  getSeasonalOutlook,
  getWeeklyForecast,
} from '../../shared/api/forecastService';
import { getSubseasonalOutlook, getSubseasonalOutlookSet } from '../../shared/api/subseasonalService';
import { getCurrentConditions } from '../../shared/api/weatherService';
import { HOME_LOCATIONS } from '../../shared/data/mockWeather';
import { useLocationStore } from '../../shared/state/locationStore';

function slugifyRegion(region: string): string {
  return region.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Composes every query the Forecasts tab needs, keyed off the same
 * `locationStore.selectedLocationId` Home uses — one location, one source
 * of truth, no separate "favourite locations" selector to keep in sync.
 * All queries fire eagerly regardless of which segment (Today/7-Day/
 * Outlook) is active, so switching segments feels instant once the first
 * load completes — the same pattern useHomeData already uses for its cards.
 */
export function useForecastsData() {
  const locationId = useLocationStore((state) => state.selectedLocationId);
  const hasHydrated = useLocationStore((state) => state.hasHydrated);
  const location = HOME_LOCATIONS.find((entry) => entry.id === locationId);
  const regionId = location ? slugifyRegion(location.region) : 'accra';

  const conditions = useQuery({
    queryKey: ['currentConditions', locationId],
    queryFn: () => getCurrentConditions(locationId),
    enabled: hasHydrated,
  });

  const hourly = useQuery({
    queryKey: ['hourlyForecast', locationId],
    queryFn: () => getHourlyForecast(locationId),
    enabled: hasHydrated,
  });

  const weekly = useQuery({
    queryKey: ['weeklyForecast', locationId],
    queryFn: () => getWeeklyForecast(locationId),
    enabled: hasHydrated,
  });

  const subseasonal = useQuery({
    queryKey: ['subseasonalOutlook', locationId],
    queryFn: () => getSubseasonalOutlook(locationId),
    enabled: hasHydrated,
    // This one throws on an empty field rather than returning a flag, so the
    // poll has to key off the error. Same bounded wait as the map above.
    refetchInterval: (query) =>
      query.state.status === 'error' && /being prepared/.test(String(query.state.error)) ? 4000 : false,
  });

  // The national picture behind the map. Its own key rather than a slice of the
  // card's query, because it does not vary by town — sixteen regions are the
  // same sixteen wherever the reader is standing, so switching town must not
  // refetch it.
  const subseasonalSet = useQuery({
    queryKey: ['subseasonalOutlookSet'],
    queryFn: getSubseasonalOutlookSet,
    enabled: hasHydrated,
    // The server starts the 165-point fetch without waiting for it, so the first
    // response on a cold cache is legitimately empty and a few seconds early.
    // Polling only while that is true turns a dead end into a short wait: the
    // map fills itself in, and the interval stops the moment it does.
    refetchInterval: (query) => (query.state.data?.computing ? 4000 : false),
  });

  const seasonal = useQuery({
    queryKey: ['seasonalOutlook', regionId],
    queryFn: () => getSeasonalOutlook(regionId),
    enabled: hasHydrated,
  });

  return {
    locationName: location?.name ?? '',
    conditions,
    hourly,
    weekly,
    subseasonal,
    subseasonalSet,
    seasonal,
  };
}
