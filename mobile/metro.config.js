const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro yapılandırması — https://reactnative.dev/docs/metro
 * watchFolders: '@shared' (../shared/types) paketinin Metro tarafından izlenebilmesi için.
 */
const config = {
  watchFolders: [path.resolve(__dirname, '../shared')],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
