const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro will not bundle a file extension it does not recognise, and the crop
// classifier is shipped as a `.tflite` binary in assets/models. Without this the
// `require()` in localModel/classifier.ts resolves to nothing and on-device
// diagnosis fails at runtime with no build-time warning.
config.resolver.assetExts.push('tflite');

module.exports = config;
