import { AppState, Platform, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';

import { NetworkError } from './http';
import { ServiceError } from './mockDelay';

/**
 * Whether a failed query is worth another automatic attempt.
 *
 * `retry: 2` used to apply to every failure alike, and on this app's
 * connections that was the slowest possible answer. A backend that never
 * replies costs the full ten-second budget per attempt, so three attempts kept
 * a screen on its skeleton for over half a minute before the saved copy or the
 * retry button could appear.
 *
 * - The server said no (a 4xx, or a mock service's "no such town"): asking
 *   again gets the same no. Not retried.
 * - The server could not be reached: one more try covers a dropped packet;
 *   a second rarely helps and doubles the wait.
 * - The server broke (5xx) or something unexpected threw: the old two retries.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ServiceError) {
    return error.status !== undefined && error.status >= 500 && failureCount < 2;
  }
  if (error instanceof NetworkError) {
    return failureCount < 1;
  }
  return failureCount < 2;
}

/**
 * One QueryClient for the whole app. `staleTime` is deliberately generous
 * (5 minutes) — this is a low-bandwidth-first app for farmers, so screens
 * shouldn't silently re-fetch mock/real data just because a tab regained
 * focus. See `shouldRetryQuery` for the retry policy.
 *
 * `networkMode: 'always'` keeps a query running, and failing, while the phone
 * reports no connection. TanStack's default pauses it instead, which would
 * leave the query pending forever, and `useCachedQuery` only shows the saved
 * copy once a query has *failed*. Offline has to fail fast.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: shouldRetryQuery,
      refetchOnReconnect: true,
      networkMode: 'always',
    },
  },
});

/**
 * Tells TanStack Query about the phone, which it cannot see for itself.
 *
 * On the web it listens for the browser's online and focus events. React
 * Native has neither, so until this runs `refetchOnReconnect` does nothing:
 * a screen that failed offline stayed failed after the signal came back, until
 * the farmer found the retry button. Coming back to the app after five minutes
 * likewise never refreshed the weather.
 *
 * Called once, from the root layout. Kept out of module scope so importing the
 * client (every screen test does) does not attach device listeners.
 */
export function bindQueryClientToDevice(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      // `isConnected` is null while NetInfo is still finding out. Treat that as
      // online rather than flapping offline on every launch.
      setOnline(state.isConnected !== false);
    }),
  );

  if (Platform.OS !== 'web') {
    focusManager.setEventListener((setFocused) => {
      const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
        setFocused(status === 'active');
      });
      return () => subscription.remove();
    });
  }
}
