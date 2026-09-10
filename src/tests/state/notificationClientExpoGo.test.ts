/**
 * The regression this locks: `expo-notifications` throws the moment it is
 * evaluated in Expo Go (its native modules are absent since SDK 53). A top-level
 * `import` of it in notificationClient.ts therefore took down every screen that
 * transitively imports the reminder store — via the root layout, all of them —
 * before any `canScheduleNotifications()` guard could run.
 *
 * So this suite makes the module throw on load and the runtime look like Expo Go,
 * then asserts that importing notificationClient and calling its surface is inert
 * rather than explosive. The rest of the notification tests mock the package with
 * a working stub, so none of them exercise this path.
 */

import {
  attachResponseListener,
  canScheduleNotifications,
  cancelAllReminders,
  cancelReminder,
  ensurePermission,
  getPermissionState,
  requestPermission,
  scheduleReminder,
  schedulingBlocker,
} from '../../shared/notifications/notificationClient';
import type { FarmReminder } from '../../shared/domain/farmReminder';

// jest hoists these above the imports. Unlike jest.setup.js's working stub, this
// expo-notifications factory throws on evaluation — the real Expo Go behaviour.
// If notificationClient ever require()s it in this environment, that throw
// surfaces and the test fails.
jest.mock('expo-notifications', () => {
  throw new Error('expo-notifications: removed from Expo Go with the release of SDK 53');
});

// Report the Store client, i.e. Expo Go — the environment where the package is
// unusable and must never be loaded.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'storeClient', expoConfig: {} },
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));

function reminder(overrides: Partial<FarmReminder> = {}): FarmReminder {
  const now = new Date().toISOString();
  return {
    id: 'r1',
    title: 'Spray the tomatoes',
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    repeat: 'none',
    isDone: false,
    source: 'manual',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

it('imports without evaluating expo-notifications', () => {
  // Reaching this line at all means the module graph built — the import above
  // did not throw.
  expect(canScheduleNotifications()).toBe(false);
});

it('reports the expo-go blocker rather than a permission problem', () => {
  expect(schedulingBlocker('granted')).toBe('expo-go');
});

it('treats every scheduling call as a no-op instead of throwing', async () => {
  await expect(scheduleReminder(reminder())).resolves.toBeNull();
  await expect(cancelReminder('some-handle')).resolves.toBeUndefined();
  await expect(cancelAllReminders()).resolves.toBeUndefined();
  await expect(ensurePermission()).resolves.toBe('denied');
  await expect(getPermissionState()).resolves.toBe('denied');
  await expect(requestPermission()).resolves.toBe('denied');
});

it('returns a no-op unsubscribe from the response listener', () => {
  const unsubscribe = attachResponseListener(() => {});
  expect(typeof unsubscribe).toBe('function');
  expect(() => unsubscribe()).not.toThrow();
});
