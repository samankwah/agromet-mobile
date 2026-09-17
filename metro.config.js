const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Expo's default config plus Sentry's debug IDs, which tie a crash's stack trace
// back to the source map of the exact bundle that produced it. Everything Expo's
// `getDefaultConfig` sets is kept; Sentry only adds to the serializer.
const config = getSentryExpoConfig(__dirname);

// Metro will not bundle a file extension it does not recognise, and the crop
// classifier is shipped as a `.tflite` binary in assets/models. Without this the
// `require()` in localModel/classifier.ts resolves to nothing and on-device
// diagnosis fails at runtime with no build-time warning.
config.resolver.assetExts.push('tflite');

module.exports = config;
