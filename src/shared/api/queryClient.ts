import { QueryClient } from '@tanstack/react-query';

/**
 * One QueryClient for the whole app. `staleTime` is deliberately generous
 * (5 minutes) — this is a low-bandwidth-first app for farmers, so screens
 * shouldn't silently re-fetch mock/real data just because a tab regained
 * focus. `retry: 2` gives transient failures a couple of automatic attempts
 * before a screen's AsyncStateView shows a manual retry button.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnReconnect: true,
    },
  },
});
