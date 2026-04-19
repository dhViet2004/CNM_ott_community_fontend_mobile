import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

const monoFamily = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const typography = {
  display: {
    fontFamily,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  } as TextStyle,

  h1: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.3,
  } as TextStyle,

  h2: {
    fontFamily,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  } as TextStyle,

  h3: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  } as TextStyle,

  subtitle: {
    fontFamily,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  } as TextStyle,

  body: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  } as TextStyle,

  bodySmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  } as TextStyle,

  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  } as TextStyle,

  button: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0.3,
  } as TextStyle,

  tabLabel: {
    fontFamily,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  } as TextStyle,

  badge: {
    fontFamily,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  } as TextStyle,

  mono: {
    fontFamily: monoFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  } as TextStyle,
};

export default typography;
