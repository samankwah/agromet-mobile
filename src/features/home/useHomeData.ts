import { getWeeklyForecast } from '../../shared/api/forecastService';
import { useCachedQuery } from '../../shared/api/useCachedQuery';
import { getCurrentConditions } from '../../shared/api/weatherService';
import { HOME_LOCATIONS } from '../../shared/data/mockWeather';
import { useLocationStore } from '../../shared/state/locationStore';
import { useDetectedDistrict } from '../advisories/weather-alerts/useDetectedDistrict';
import { useWeatherAlerts } from '../advisories/weather-alerts/useWeatherAlerts';

/**
 * Composes everything Home's cards need: the persisted town selection
 * (now `locationStore`, not local state — see shared/state/locationStore.ts),
 * current-conditions and forecast queries for that town, and the
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

  // Both cards keep their last answer on the phone, so a launch with no signal
  // shows yesterday's weather, dated, instead of two error cards. The keys are
  // the ones the Forecasts tab uses, so either screen fills the other's copy.
  const weather = useCachedQuery({
    queryKey: ['currentConditions', locationId],
    queryFn: () => getCurrentConditions(locationId),
    cacheKey: `weather:current:${locationId}`,
    enabled: hasHydrated,
    showCachedWhilePending: true,
  });

  // Same key as the Forecasts tab and `useWeatherAlerts` below, so Home makes
  // one forecast request that feeds the card and the alert banner both.
  const forecast = useCachedQuery({
    queryKey: ['weeklyForecast', locationId],
    queryFn: () => getWeeklyForecast(locationId),
    cacheKey: `forecast:weekly:${locationId}`,
    enabled: hasHydrated,
    showCachedWhilePending: true,
  });

  const alerts = useWeatherAlerts(locationId, hasHydrated);

  return {
    locations: HOME_LOCATIONS,
    locationId,
    setLocationId,
    weather,
    forecast,
    alerts,
    locationPrompt: alerts.locationPrompt,
    locationPermission: alerts.locationPermission,
  };
}
