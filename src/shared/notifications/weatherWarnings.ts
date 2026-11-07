import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { postJson } from '../api/http';
import { HOME_LOCATIONS } from '../data/mockWeather';
import { WARNING_HAZARDS, type WarningHazard } from '../domain/userSettings';
import type { WeatherAlert } from '../domain/weatherAlert';
import { firstDueTime, hazardOf, warningNotificationText } from '../domain/warningTiming';
import { cancelNotifications, getExpoPushToken, getPermissionState, scheduleWeatherWarning } from './notificationClient';

/**
 * Weather warnings as notifications, even with the app closed.
 *
 * Two routes, so a warning gets through either way:
 *
 *  1. **Server push, the main one.** The phone registers its Expo push token
 *     with the farmer's town and the warning types left on. The server checks
 *     every 30 minutes and pushes each due warning once
 *     (`backend/app/routers/push.py`).
 *  2. **On the phone, the backup.** When the phone has not managed to register
 *     in the last day (no connection, no token, the push service down), the
 *     warnings already in the forecast are scheduled on the phone instead, at
 *     the same moments the server would send them (`domain/warningTiming.ts`).
 *     Never both: while registration is working, nothing is scheduled here, so
 *     a farmer is not warned twice.
 */

const TOKEN_KEY = 'agromet:push:token';
const REGISTERED_AT_KEY = 'agromet:push:registeredAt';
const LOCAL_IDS_KEY = 'agromet:push:localIds';

/** How long a registration counts as working before the backup takes over. */
export const PUSH_HEALTHY_MS = 24 * 60 * 60 * 1000;

export type WarningSettings = {
  enabled: boolean;
  hazards: Record<WarningHazard, boolean>;
};

export type WarningPlace = { lat: number; lng: number; name: string; region: string };

/** The banner's own town (`locationStore.selectedLocationId`), so the
 * notification is about the place the app shows. */
export function placeFor(locationId: string): WarningPlace | null {
  const town = HOME_LOCATIONS.find((entry) => entry.id === locationId);
  return town ? { lat: town.lat, lng: town.lng, name: town.name, region: town.region } : null;
}

function enabledHazards(settings: WarningSettings): WarningHazard[] {
  return WARNING_HAZARDS.filter((hazard) => settings.hazards[hazard]);
}

export type RegistrationResult = 'registered' | 'unregistered' | 'no-permission' | 'no-token' | 'no-place' | 'failed';

/**
 * Tell the server where to send this phone's warnings, or that it should stop.
 * Safe to call often: the server updates rather than duplicates. Never throws.
 */
export async function syncPushRegistration(settings: WarningSettings, place: WarningPlace | null): Promise<RegistrationResult> {
  const permission = await getPermissionState();
  const wanted = settings.enabled && enabledHazards(settings).length > 0;

  if (!wanted || permission !== 'granted') {
    await unregister();
    return wanted ? 'no-permission' : 'unregistered';
  }
  if (!place) return 'no-place';

  const token = await getExpoPushToken();
  if (!token) return 'no-token';

  try {
    await postJson('/api/push/register', {
      token,
      platform: Platform.OS,
      // Rounded on the phone too: about a kilometre is all the server needs.
      lat: Math.round(place.lat * 100) / 100,
      lng: Math.round(place.lng * 100) / 100,
      placeName: place.name,
      region: place.region,
      hazards: enabledHazards(settings),
      enabled: true,
    });
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [REGISTERED_AT_KEY, String(Date.now())],
    ]);
    return 'registered';
  } catch {
    return 'failed';
  }
}

async function unregister(): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  await AsyncStorage.multiRemove([REGISTERED_AT_KEY]).catch(() => {});
  if (!token) return;
  try {
    await postJson('/api/push/unregister', { token });
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // Left for the next sync to try again.
  }
}

/** Whether the server route has worked within the last day. */
export async function isPushHealthy(now: number = Date.now()): Promise<boolean> {
  const stamp = Number(await AsyncStorage.getItem(REGISTERED_AT_KEY).catch(() => null));
  return Number.isFinite(stamp) && stamp > 0 && now - stamp < PUSH_HEALTHY_MS;
}

/**
 * The backup: schedule the forecast's warnings on the phone, unless the server
 * route is working. Replaces whatever it scheduled last time. Returns how many
 * were scheduled.
 */
export async function scheduleLocalWarnings(alerts: WeatherAlert[], settings: WarningSettings, now: Date = new Date()): Promise<number> {
  const previous: string[] = JSON.parse((await AsyncStorage.getItem(LOCAL_IDS_KEY).catch(() => null)) ?? '[]');
  await cancelNotifications(previous);

  const ids: string[] = [];
  if (settings.enabled && !(await isPushHealthy(now.getTime()))) {
    for (const alert of alerts) {
      const hazard = hazardOf(alert);
      if (!hazard || !settings.hazards[hazard]) continue;
      const at = firstDueTime(alert, now);
      if (!at) continue;
      const { title, body } = warningNotificationText(alert);
      const id = await scheduleWeatherWarning({ title, body, alertId: alert.id, hazard }, at, now);
      if (id) ids.push(id);
    }
  }
  await AsyncStorage.setItem(LOCAL_IDS_KEY, JSON.stringify(ids)).catch(() => {});
  return ids.length;
}

/** Ask the server for a test notification, from Settings. */
export async function sendTestWarning(): Promise<boolean> {
  const token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  if (!token) return false;
  try {
    await postJson('/api/push/test', { token });
    return true;
  } catch {
    return false;
  }
}
