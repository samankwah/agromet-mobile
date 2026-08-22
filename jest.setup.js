// AsyncStorage's native module doesn't exist under Jest's Node
// environment — mock it with the library's own official in-memory mock so
// anything that touches it (Zustand's persist middleware, shared/storage/
// cache.ts) works in tests without a real device/simulator.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// react-native-webview is likewise a native module with no Jest binary.
// Stand it in as a plain View so components that embed a WebView (the
// MapLibre map) still mount and can be smoke-tested. The map's own
// behaviour lives in the injected HTML, which Jest can't execute anyway —
// so this mock loses no meaningful coverage.
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: View, default: View };
});

// NetInfo is native too. Its own official mock reports a connected state,
// which is what we want by default — components that branch on
// connectivity (the map's online/offline renderer) then exercise their
// primary path, and a test can override this per-case when it needs the
// offline branch.
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));

// expo-notifications is a native module and, more to the point, scheduling
// against a real OS clock in a unit test would be untestable and slow. The
// mock records what would have been scheduled so tests can assert on it, and
// returns permission as granted by default — the primary path. A test that
// needs the denied branch overrides `getPermissionsAsync` per case.
jest.mock('expo-notifications', () => {
  let counter = 0;
  return {
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => undefined),
    getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
    scheduleNotificationAsync: jest.fn(async () => `scheduled-${(counter += 1)}`),
    cancelScheduledNotificationAsync: jest.fn(async () => undefined),
    cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
    getLastNotificationResponseAsync: jest.fn(async () => null),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    AndroidImportance: { HIGH: 4 },
    AndroidNotificationVisibility: { PUBLIC: 1 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
  };
});

// expo-constants reports the Store client (Expo Go) by default in Jest, which
// would make canScheduleNotifications() false and short-circuit every
// scheduling test. Report a standalone build instead — the environment the
// feature is actually designed for.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone', expoConfig: {} },
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));
