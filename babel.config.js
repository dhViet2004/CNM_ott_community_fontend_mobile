module.exports = function (api) {
  api.cache(true);

  const useMocks = process.env.EXPO_USE_MOCKS !== 'false';

  const alias = {
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
  };

  if (useMocks) {
    console.log('\x1b[33m%s\x1b[0m', ' [Mock Setup] Aliasing react-native-agora and firebase-messaging to local mocks');
    alias['react-native-agora'] = './src/mocks/react-native-agora';
    alias['@react-native-firebase/messaging'] = './src/mocks/react-native-firebase-messaging';
  }

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias,
        },
      ],
    ],
  };
};
