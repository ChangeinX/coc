module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@features': './src/features',
            '@services': './src/services',
            '@store': './src/store',
            '@theme': './src/theme',
            '@lib': './src/lib',
            '@components': './src/components',
            '@constants': './src/constants',
            '@utils': './src/utils',
            '@types': './src/types',
            '@env': './src/env',
            '@navigation': './src/navigation',
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
