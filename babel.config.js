module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // react-native-worklets/plugin is Reanimated v4's babel plugin (moved
    // out of react-native-reanimated itself) — required at runtime by
    // NativeWind's css-interop layer, even though this app doesn't use
    // Reanimated animations directly. Must be listed last.
    plugins: ['react-native-worklets/plugin'],
  };
};
