import { QueryClient } from '@tanstack/react-query';

/**
 * A client of its own, with retries off.
 *
 * The shared app client (`shared/api/queryClient.ts`) sets `retry: 2`, which
 * is right on a phone and wrong in Jest: a rejected fetch then schedules
 * backoff timers that outlive the test and hang the worker. Every screen test
 * that renders against a live `QueryClientProvider` should build its own with
 * this, not import the app singleton.
 */
export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}
