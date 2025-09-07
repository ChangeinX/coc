// Use Expo's Metro config to enable virtual entry (.expo/.virtual-metro-entry)
const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
module.exports = getDefaultConfig(__dirname);
