import { useQuery } from '@tanstack/react-query';

import {
  getForecastMapLayers,
  getHourlyForecast,
  getSeasonalOutlook,
  getSubseasonalOutlook,
  getWeeklyForecast,
} from '../../shared/api/forecastService';
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
  });

  const seasonal = useQuery({
    queryKey: ['seasonalOutlook', regionId],
    queryFn: () => getSeasonalOutlook(regionId),
    enabled: hasHydrated,
  });

  const mapLayers = useQuery({
    queryKey: ['forecastMapLayers'],
    queryFn: getForecastMapLayers,
    enabled: hasHydrated,
  });

  return {
    locationName: location?.name ?? '',
    conditions,
    hourly,
    weekly,
    subseasonal,
    seasonal,
    mapLayers,
  };
}
