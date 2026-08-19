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
