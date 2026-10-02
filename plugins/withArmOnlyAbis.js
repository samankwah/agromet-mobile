const { withGradleProperties } = require('expo/config-plugins');

/**
 * Builds only the two ARM processor types when AGROMET_ARM_ONLY=1.
 *
 * The direct-download APK (eas.json `preview`) otherwise carries native code
 * for x86 and x86_64 too, which only PC emulators use: about 80 MB of a
 * 193 MB download that every farmer on mobile data pays for. Real Android
 * phones are ARM.
 *
 * Opt-in by environment variable rather than always on, so development
 * builds keep x86_64 and still install on the emulator. Play Store builds do
 * not need it either: Google serves each phone only its own processor's code
 * from the app bundle.
 */
module.exports = function withArmOnlyAbis(config) {
  if (process.env.AGROMET_ARM_ONLY !== '1') return config;

  return withGradleProperties(config, (cfg) => {
    const key = 'reactNativeArchitectures';
    const value = 'armeabi-v7a,arm64-v8a';
    const existing = cfg.modResults.find((item) => item.type === 'property' && item.key === key);
    if (existing) existing.value = value;
    else cfg.modResults.push({ type: 'property', key, value });
    return cfg;
  });
};
