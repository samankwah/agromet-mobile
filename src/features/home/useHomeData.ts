import { useQuery } from '@tanstack/react-query';

import { getLatestAdvisoryTeaser } from '../../shared/api/advisoryService';
import { getFeaturedWeeklyForecast } from '../../shared/api/forecastService';
import { getLatestNewsTeaser } from '../../shared/api/newsService';
import { getCurrentConditions } from '../../shared/api/weatherService';
import { getDistrictNameForLocation } from '../../shared/data/districts';
import { HOME_LOCATIONS } from '../../shared/data/mockWeather';
import { useLocationStore } from '../../shared/state/locationStore';
import { useAlerts } from '../advisories/weather-alerts/useAlerts';

/**
 * Composes everything Home's cards need: the persisted town selection
 * (now `locationStore`, not local state — see shared/state/locationStore.ts),
 * current-conditions/advisory/forecast/news queries for that town's
 * district, and the alerts query for the farmer's saved districts. One
 * hook per screen keeps HomeScreen itself a pure composition of
 * components with no data logic of its own.
 */
export function useHomeData() {
  const locationId = useLocationStore((state) => state.selectedLocationId);
  const setLocationId = useLocationStore((state) => state.setSelectedLocationId);
  const savedDistrictIds = useLocationStore((state) => state.savedDistrictIds);
  const hasHydrated = useLocationStore((state) => state.hasHydrated);

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

  const forecast = useQuery({
    queryKey: ['featuredForecast', locationId],
    queryFn: () => getFeaturedWeeklyForecast(locationId),
    enabled: hasHydrated,
  });

  const news = useQuery({
    queryKey: ['latestNews'],
    queryFn: getLatestNewsTeaser,
    enabled: hasHydrated,
  });

  const alerts = useAlerts(savedDistrictIds, hasHydrated);

  return {
    locations: HOME_LOCATIONS,
    locationId,
    setLocationId,
    weather,
    advisory,
    forecast,
    news,
    alerts,
    hasSavedDistricts: savedDistrictIds.length > 0,
  };
}
