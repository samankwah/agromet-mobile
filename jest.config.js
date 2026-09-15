/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/tests/**/*.test.ts', '<rootDir>/src/tests/**/*.test.tsx'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  /**
   * Reanimated 4 keeps its worklets runtime in `react-native-worklets`, whose
   * `.native.ts` entry points reach for a native module that does not exist
   * under Jest — importing anything from Reanimated dies on
   * `Cannot read properties of undefined (reading 'loadUnpackers')`.
   *
   * The resolver the package ships for this strips the `native` extensions for
   * its own files, so the plain implementations load instead. Note this is not
   * the self-mocking jest.setup.js describes: that was true of Reanimated 3,
   * which detected Jest itself, and stopped being true at 4.
   */
  resolver: '<rootDir>/node_modules/react-native-worklets/jest/resolver.js',
  moduleNameMapper: {
    /**
     * `.tflite` is an asset extension metro was taught about in
     * metro.config.js, but jest resolves modules itself and would try to parse
     * the model binary as JavaScript. Map it to a stub so the `require()` in
     * localModel/classifier.ts resolves; what it returns does not matter,
     * because the loader that consumes it is mocked in jest.setup.js.
     */
    '\\.tflite$': '<rootDir>/src/tests/fixtures/tfliteAssetStub.js',
  },
  /**
   * Jest's default is 5000ms, and it was defeating the screen suites.
   *
   * Several of them pass longer waits internally — `WeeklyAdvisoryScreen.test`
   * uses `findByText(..., { timeout: 15000 })` — and that headroom was
   * unreachable, because the surrounding test aborted at 5000ms first. The
   * symptom was a different heavy suite failing on each parallel run, always on
   * a timeout rather than an assertion, and every one passing when run alone.
   * Easy to misread as a regression, and easy to wave away a real one as "just
   * a flake".
   *
   * These suites are genuinely slow — mount a screen, drive a couple of
   * queries, wait out `mockDelay`'s real timers — and they get slower still on
   * a machine also running Metro and an emulator. Fifteen seconds is comfortably
   * above what they need and still low enough that a genuinely hung test fails
   * rather than stalling the run.
   */
  testTimeout: 15000,
};
