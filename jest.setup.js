// react-native-gesture-handler's own official Jest setup — required as of
// the subseasonal/seasonal map's bottom sheet (@gorhom/bottom-sheet, built on
// this), or its native module throws under Jest's Node environment on first
// render. Reanimated needs no equivalent: since Reanimated 3 it detects Jest
// itself and swaps to a synchronous JS mock automatically.
require('react-native-gesture-handler/jestSetup');

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
//
// `injectJavaScript` has to exist on the instance: the map pushes its selected
// outline into the running document that way rather than rebuilding the HTML,
// and a bare View ref has no such method, so every screen embedding a map threw
// on selection. The stub records nothing because there is no JS engine behind
// it to run the script against.
// Built out here rather than inside the factory: jest hoists `jest.mock` above
// the file and forbids its factory from referencing an outer variable unless
// the name is `mock`-prefixed, which is the escape hatch jest documents.
const mockWebView = (() => {
  const React = require('react');
  const { View } = require('react-native');

  const Mock = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ injectJavaScript: () => {}, postMessage: () => {}, reload: () => {} }));
    return React.createElement(View, props);
  });
  Mock.displayName = 'WebView';
  return Mock;
})();

jest.mock('react-native-webview', () => ({ WebView: mockWebView, default: mockWebView }));

// @gorhom/bottom-sheet's own scroll handling calls Reanimated's
// `useAnimatedScrollHandler`, which requires the Babel worklet plugin to have
// marked its handler functions at compile time. That marking does not happen
// for this library's own source under Jest's transform — a Metro-vs-Jest
// difference, not an app bug; the real sheet works fine on device — so a
// stand-in that captures this component's actual contract (a ref exposing
// `snapToIndex`, a `handleComponent`/`footerComponent` render prop, plain
// scrollable children) is what lets `shared/ui/Drawer.tsx` and its consumers
// be tested at all, the same trade a native module with no Jest binary
// already makes above for `react-native-webview`.
const mockBottomSheet = (() => {
  const React = require('react');
  const { View } = require('react-native');

  const BottomSheet = React.forwardRef(({ handleComponent: Handle, footerComponent: Footer, children }, ref) => {
    React.useImperativeHandle(ref, () => ({
      snapToIndex: () => {},
      snapToPosition: () => {},
      expand: () => {},
      collapse: () => {},
      close: () => {},
      forceClose: () => {},
    }));
    const dummyAnimatedProp = { value: 0 };
    return React.createElement(
      View,
      null,
      Handle ? React.createElement(Handle, { animatedIndex: dummyAnimatedProp, animatedPosition: dummyAnimatedProp }) : null,
      children,
      Footer ? React.createElement(Footer, { animatedFooterPosition: dummyAnimatedProp }) : null,
    );
  });
  BottomSheet.displayName = 'BottomSheet';

  const BottomSheetScrollView = React.forwardRef((props, ref) => React.createElement(View, { ...props, ref }));
  BottomSheetScrollView.displayName = 'BottomSheetScrollView';

  const BottomSheetFooter = ({ children }) => React.createElement(View, null, children);
  BottomSheetFooter.displayName = 'BottomSheetFooter';

  return { BottomSheet, BottomSheetScrollView, BottomSheetFooter };
})();

jest.mock('@gorhom/bottom-sheet', () => ({
  __esModule: true,
  default: mockBottomSheet.BottomSheet,
  BottomSheetScrollView: mockBottomSheet.BottomSheetScrollView,
  BottomSheetFooter: mockBottomSheet.BottomSheetFooter,
}));

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

// expo-location is a native module. The default mock reports permission granted
// and returns a fix over Kumasi, so the district-autodetect path runs its
// primary branch in tests; a case that needs "denied" or "no fix" overrides
// getForegroundPermissionsAsync / getCurrentPositionAsync per test.
jest.mock('expo-location', () => ({
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3, High: 4, Highest: 5, BestForNavigation: 6 },
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 6.6885, longitude: -1.6244 } })),
}));

// expo-constants reports the Store client (Expo Go) by default in Jest, which
// would make canScheduleNotifications() false and short-circuit every
// scheduling test. Report a standalone build instead — the environment the
// feature is actually designed for.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone', expoConfig: {} },
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));

// expo-audio is native. The recorder is stubbed rather than simulated: what is
// worth testing is the state machine around it (permission refused, empty
// transcript, cancel discards) and none of that needs real audio.
//
// `mock`-prefixed and built outside the factory for the same reason the WebView
// mock is: jest forbids a hoisted mock factory from referencing an outer
// variable unless its name is `mock`-prefixed.
const mockAudioRecorder = {
  prepareToRecordAsync: jest.fn(async () => {}),
  record: jest.fn(),
  stop: jest.fn(async () => {}),
  uri: 'file:///question.m4a',
};

jest.mock('expo-audio', () => ({
  useAudioRecorder: () => mockAudioRecorder,
  useAudioRecorderState: () => ({ isRecording: false, durationMillis: 0, canRecord: true }),
  RecordingPresets: { LOW_QUALITY: {}, HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn(async () => {}),
  getRecordingPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
}));

// expo-speech reads replies aloud. Mocked as a recorder of calls so a test can
// assert what would have been spoken without a TTS engine.
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => {}),
  isSpeakingAsync: jest.fn(async () => false),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));

// react-native-fast-tflite is a Nitro module with a C++ implementation, so
// there is nothing for jest to load. The stub reports the tensor shapes the
// real bundled model has, which matters: classifier.ts validates them at load
// and would otherwise be untestable. `run` echoes whatever scores a test set,
// so the interesting behaviour (argmax, the confidence floor, the shape guard)
// is exercised without a device.
//
// Defined outside the factory under a `mock`-prefixed name for the same reason
// as the WebView stub above (jest's hoisted-factory scope rule).
const mockTflite = (() => {
  const CLASS_COUNT = 5;
  const INPUT_SIZE = 224;

  // Uniform scores, i.e. 0.2 each, which is below the reportable floor. A test
  // that wants an answer has to ask for one; a test that forgets gets the
  // honest "not confident enough" path rather than an accidental diagnosis.
  let scores = new Float32Array(CLASS_COUNT).fill(1 / CLASS_COUNT);
  let inputs = [{ name: 'image', dataType: 'float32', shape: [1, INPUT_SIZE, INPUT_SIZE, 3] }];
  let outputs = [{ name: 'probabilities', dataType: 'float32', shape: [1, CLASS_COUNT] }];
  let loadError = null;
  let lastInput = null;

  const model = {
    get inputs() {
      return inputs;
    },
    get outputs() {
      return outputs;
    },
    delegates: [],
    run: jest.fn(async (input) => {
      lastInput = input;
      return [scores.buffer.slice(0)];
    }),
    runSync: jest.fn(() => [scores.buffer.slice(0)]),
  };

  const loadTensorflowModel = jest.fn(async () => {
    if (loadError) throw loadError;
    return model;
  });

  return {
    loadTensorflowModel,
    __model: model,
    /** Set the softmax output the next run should return. */
    __setScores: (next) => {
      scores = Float32Array.from(next);
    },
    /** Override the reported tensor shapes to test the contract guard. */
    __setTensors: (nextInputs, nextOutputs) => {
      if (nextInputs) inputs = nextInputs;
      if (nextOutputs) outputs = nextOutputs;
    },
    __failLoad: (error) => {
      loadError = error;
    },
    __lastInput: () => lastInput,
    __reset: () => {
      scores = new Float32Array(CLASS_COUNT).fill(1 / CLASS_COUNT);
      inputs = [{ name: 'image', dataType: 'float32', shape: [1, INPUT_SIZE, INPUT_SIZE, 3] }];
      outputs = [{ name: 'probabilities', dataType: 'float32', shape: [1, CLASS_COUNT] }];
      loadError = null;
      lastInput = null;
      model.run.mockClear();
      // Cleared too, so a test asserting on load count is not reading calls
      // made by whichever test happened to run before it.
      loadTensorflowModel.mockClear();
    },
  };
})();

jest.mock('react-native-fast-tflite', () => mockTflite);
