module.exports = {
  root: true,
  extends: ['expo', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'warn',
    'no-var': 'error',
    'object-shorthand': 'warn',
    'quote-props': ['warn', 'as-needed'],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
  overrides: [
    {
      files: ['*.tsx'],
      rules: {
        'react/prop-types': 'off',
      },
    },
  ],
  settings: {
    'import/resolver': {
      alias: {
        map: [
          ['@/', './src/'],
          ['@components', './src/components/'],
          ['@common', './src/components/common/'],
          ['@features', './src/features/'],
          ['@navigation', './src/navigation/'],
          ['@theme', './src/theme/'],
          ['@store', './src/store/'],
          ['@api', './src/api/'],
          ['@utils', './src/utils/'],
          ['@types', './src/types/'],
        ],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    },
  },
  env: {
    jest: true,
    'react-native': true,
  },
};