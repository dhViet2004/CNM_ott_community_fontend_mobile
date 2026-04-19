module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@common': './src/components/common',
            '@features': './src/features',
            '@navigation': './src/navigation',
            '@theme': './src/theme',
            '@store': './src/store',
            '@api': './src/api',
            '@utils': './src/utils',
            '@types': './src/types',
          },
        },
      ],
    ],
  };
};
