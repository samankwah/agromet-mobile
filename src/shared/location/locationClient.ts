import { Linking } from 'react-native';
import * as Location from 'expo-location';

/**
 * Everything that talks to the operating system's location service.
 *
 * This is the only module in the app that imports `expo-location`. The rest of
 * the geolocation feature — the resolver, the store, the detection hook — works
 * on plain coordinates and can be tested without a native module in sight.
 *
 * Unlike `expo-notifications` (see `shared/notifications/notificationClient.ts`
 * and its `require()` dance), foreground location *is* supported in Expo Go, so
 * a plain import is fine here. What still matters is that nothing throws: a
 * farmer who denies the permission, or whose phone cannot get a fix, must land
 * on a working screen that says plainly why alerts are not localised yet.
 */

/**
 * `undetermined` and `denied` are kept apart for the same reason as in
 * `notificationClient.ts`: a fresh install sits at `undetermined` and the fix
 * is to ask; `denied` (refused, `canAskAgain` false) is the only state that
 * warrants sending someone to system settings.
 */
export type LocationPermissionState = 'unknown' | 'granted' | 'undetermined' | 'denied';

function toState(response: Location.LocationPermissionResponse): LocationPermissionState {
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'undetermined' : 'denied';
}

/** The current permission state without prompting. */
export async function getLocationPermissionState(): Promise<LocationPermissionState> {
  try {
    return toState(await Location.getForegroundPermissionsAsync());
  } catch {
    return 'unknown';
  }
}

/**
 * The permission state, asking once if it has not been settled.
 *
 * Called the first time the farmer lands on a screen that localises alerts,
 * not at launch: a prompt that arrives with the alert card visible behind it
 * has a reason attached.
 */
export async function ensureLocationPermission(): Promise<LocationPermissionState> {
  try {
    const existing = await Location.getForegroundPermissionsAsync();
    if (existing.granted) return 'granted';
    // Refused for good — asking again just returns denied, so skip the round trip.
    if (!existing.canAskAgain) return 'denied';

    return toState(await Location.requestForegroundPermissionsAsync());
  } catch {
    return 'unknown';
  }
}

/**
 * The device's current position, or null when it cannot be had.
 *
 * `Low` accuracy on purpose: this picks one of 32 towns tens of kilometres
 * apart, so a city-block fix is wasted battery and a slower answer. Null is a
 * normal outcome (permission not granted, location services off, indoors with
 * no fix) and the caller must treat it as "could not localise", not an error.
 */
export async function getCurrentCoords(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
}

/** Open the OS settings page, for the case where the permission is denied for good. */
export function openLocationSettings(): void {
  Linking.openSettings().catch(() => {});
}
