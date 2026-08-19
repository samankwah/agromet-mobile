import Constants from 'expo-constants';

/** The FastAPI backend's port (backend/README.md's documented run command). */
const API_PORT = 8000;

/**
 * Where the AgroMet backend lives, resolved at runtime.
 *
 * `localhost` is wrong on every target that matters: an Android emulator
 * needs 10.0.2.2, and a physical phone needs the dev machine's LAN IP.
 * Rather than make the developer pick, reuse the host that served this
 * bundle — Expo's dev server — which is reachable from the device by
 * definition, since the app is running from it.
 *
 * `EXPO_PUBLIC_API_URL` overrides this for a deployed backend.
 */
export function getApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  // e.g. "192.168.1.20:8081" in Expo Go, undefined in Jest/production.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:${API_PORT}`;

  return `http://localhost:${API_PORT}`;
}
