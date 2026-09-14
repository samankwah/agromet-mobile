module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets/plugin is Reanimated v4's babel plugin (moved
    // out of react-native-reanimated itself). expo-router depends on
    // Reanimated, so the plugin is required even though this app defines no
    // Reanimated animations of its own. Must be listed last.
    plugins: ['react-native-worklets/plugin'],
  };
};
