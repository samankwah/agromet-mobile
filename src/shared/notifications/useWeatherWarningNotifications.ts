import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';

import { useLocationStore } from '../state/locationStore';
import { useSettingsStore } from '../state/settingsStore';
import { useWeatherAlerts } from '../../features/advisories/weather-alerts/useWeatherAlerts';
import { dateOf } from '../domain/warningTiming';
import { attachWeatherAlertListener, getPermissionState, type PermissionState } from './notificationClient';
import { registerWeatherWarningTask, unregisterWeatherWarningTask, warningSettingsFrom } from './weatherWarningTask';
import { placeFor, scheduleLocalWarnings, syncPushRegistration } from './weatherWarnings';

/**
 * Keeps weather warning notifications in step with the app, from the root
 * layout:
 *
 *  - registers this phone with the server whenever the town, the switches or
 *    the notification permission change, and on every return to the app
 *  - schedules the backup notifications on the phone from the forecast the
 *    banner already loads (the same query, so no extra request)
 *  - starts or stops the background check
 *  - opens the day's forecast, as the banner does, when a warning is tapped
 */
export function useWeatherWarningNotifications(): void {
  const prefs = useSettingsStore((state) => state.notificationPrefs);
  const locationId = useLocationStore((state) => state.selectedLocationId);
  const hasHydrated = useLocationStore((state) => state.hasHydrated);
  const { candidates } = useWeatherAlerts(locationId, hasHydrated);

  // Permission can change in the phone's settings while the app is away, so it
  // is read again each time the app comes back.
  const [permission, setPermission] = useState<PermissionState>('unknown');
  useEffect(() => {
    let active = true;
    const read = () =>
      getPermissionState().then((state) => {
        if (active) setPermission(state);
      });
    read();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') read();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const enabled = prefs.alertsEnabled;
  const hazardsKey = JSON.stringify(prefs.warningHazards);

  useEffect(() => {
    if (!hasHydrated || permission === 'unknown') return;
    const settings = warningSettingsFrom(prefs);
    let cancelled = false;
    (async () => {
      await syncPushRegistration(settings, placeFor(locationId));
      if (cancelled) return;
      await scheduleLocalWarnings(candidates, settings);
    })();
    if (enabled) registerWeatherWarningTask();
    else unregisterWeatherWarningTask();
    return () => {
      cancelled = true;
    };
    // `prefs` is read through `enabled` and `hazardsKey`, which change exactly
    // when it does in a way that matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, permission, locationId, enabled, hazardsKey, candidates]);

  useEffect(
    () =>
      attachWeatherAlertListener((alertId) => {
        const date = alertId ? dateOf({ id: alertId }) : '';
        if (date) router.push(`/forecast-day/${date}`);
        else router.push('/(tabs)/advisories');
      }),
    [],
  );
}
