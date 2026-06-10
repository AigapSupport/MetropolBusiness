// Babel yapılandırması — RN preset + '@'/'@shared' alias çözümü (tsconfig paths ile eş).
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@shared': '../shared/types/src',
          '@': './src',
        },
      },
    ],
  ],
};
