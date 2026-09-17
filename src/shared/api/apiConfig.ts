import Constants from 'expo-constants';

/** The FastAPI backend's port (backend/README.md's documented run command). */
const API_PORT = 8000;

let warnedAboutMissingUrl = false;

/**
 * Where the AgroMet backend lives, resolved at runtime.
 *
 * `EXPO_PUBLIC_API_URL` wins whenever it is a real http(s) URL. Release builds
 * get it from their profile in `eas.json`; nothing else points them anywhere.
 *
 * Development falls back to the host that served this bundle, Expo's dev
 * server, which is reachable from an emulator or a phone by definition, since
 * the app is running from it. `localhost` is wrong on every target that
 * matters: an Android emulator needs 10.0.2.2, and a phone needs the dev
 * machine's LAN IP.
 *
 * A release build with no usable URL used to fall through to
 * `http://localhost:8000` in silence, which on a farmer's phone means every
 * backend feature fails with "check your connection" and nothing says why. It
 * still has nowhere better to go, but it now says so once, loudly, in the
 * device log and in crash reports.
 */
export function getApiBaseUrl(env: { url?: string; hostUri?: string; isDev?: boolean } = {}): string {
  const explicit = (env.url ?? process.env.EXPO_PUBLIC_API_URL)?.trim();
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit.replace(/\/+$/, '');

  // e.g. "192.168.1.20:8081" in Expo Go, undefined in Jest/production.
  const hostUri = env.hostUri ?? Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${API_PORT}`;

  const isDev = env.isDev ?? __DEV__;
  if (!isDev && !warnedAboutMissingUrl) {
    warnedAboutMissingUrl = true;
    console.error(
      `EXPO_PUBLIC_API_URL is ${explicit ? `not a URL ("${explicit}")` : 'not set'} in this release build. ` +
        'Every backend request will fail. Set it in the build profile in eas.json.',
    );
  }
  return `http://localhost:${API_PORT}`;
}
