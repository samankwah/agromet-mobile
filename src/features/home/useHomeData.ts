import { useQuery } from '@tanstack/react-query';

import { getLatestAdvisoryTeaser } from '../../shared/api/advisoryService';
import { getWeeklyForecast } from '../../shared/api/forecastService';
import { getLatestNewsTeaser } from '../../shared/api/newsService';
import { getCurrentConditions } from '../../shared/api/weatherService';
import { getDistrictNameForLocation } from '../../shared/data/districts';
import { HOME_LOCATIONS } from '../../shared/data/mockWeather';
import { useLocationStore } from '../../shared/state/locationStore';
import { useDetectedDistrict } from '../advisories/weather-alerts/useDetectedDistrict';
import { useWeatherAlerts } from '../advisories/weather-alerts/useWeatherAlerts';

/**
 * Composes everything Home's cards need: the persisted town selection
 * (now `locationStore`, not local state — see shared/state/locationStore.ts),
 * current-conditions/advisory/forecast/news queries for that town, and the
 * severe-weather alerts for it. One hook per screen keeps HomeScreen itself a
 * pure composition of components with no data logic of its own.
 */
export function useHomeData() {
  const locationId = useLocationStore((state) => state.selectedLocationId);
  const setLocationId = useLocationStore((state) => state.setSelectedLocationId);
  const hasHydrated = useLocationStore((state) => state.hasHydrated);

  // Ask for location and pick the nearest town the first time Home mounts with
  // nothing chosen. No-ops on every later mount. Also feeds the Flood & Drought
  // "your area" scope — see shared/location.
  useDetectedDistrict();

  const weather = useQuery({
    queryKey: ['currentConditions', locationId],
    queryFn: () => getCurrentConditions(locationId),
    enabled: hasHydrated,
  });

  const districtName = getDistrictNameForLocation(locationId);

  const advisory = useQuery({
    queryKey: ['advisoryTeaser', districtName],
    queryFn: () => getLatestAdvisoryTeaser(districtName),
    enabled: hasHydrated,
  });

  // Same key as the Forecasts tab and `useWeatherAlerts` below, so Home makes
  // one forecast request that feeds the card and the alert banner both.
  const forecast = useQuery({
    queryKey: ['weeklyForecast', locationId],
    queryFn: () => getWeeklyForecast(locationId),
    enabled: hasHydrated,
  });

  const news = useQuery({
    queryKey: ['latestNews'],
    queryFn: getLatestNewsTeaser,
    enabled: hasHydrated,
  });

  const alerts = useWeatherAlerts(locationId, hasHydrated);

  return {
    locations: HOME_LOCATIONS,
    locationId,
    setLocationId,
    weather,
    advisory,
    forecast,
    news,
    alerts,
    locationPrompt: alerts.locationPrompt,
    locationPermission: alerts.locationPermission,
  };
}
