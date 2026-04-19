export const lightColors = {
  primary: '#0068FF',
  primaryDark: '#0052CC',
  primaryLight: '#3385FF',
  secondary: '#0084FF',
  secondaryDark: '#0068CC',
  secondaryLight: '#3399FF',
  accent: '#00BFFF',
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    tertiary: '#EBEBEB',
    chatBg: '#E5E5E5',
    tabBar: '#FAFAFA',
  },
  text: {
    primary: '#1A1A1A',
    secondary: '#666666',
    tertiary: '#999999',
    placeholder: '#AAAAAA',
    inverse: '#FFFFFF',
    link: '#0068FF',
  },
  border: {
    default: '#E0E0E0',
    light: '#F0F0F0',
    focus: '#0068FF',
  },
  status: {
    success: '#00C853',
    error: '#FF3B30',
    warning: '#FF9500',
    info: '#007AFF',
  },
  badge: {
    unread: '#FF3B30',
    online: '#34C759',
    offline: '#8E8E93',
  },
  shadow: {
    light: 'rgba(0, 0, 0, 0.08)',
    medium: 'rgba(0, 0, 0, 0.12)',
    heavy: 'rgba(0, 0, 0, 0.20)',
  },
};

export const darkColors = {
  ...lightColors,
  primary: '#3399FF',
  primaryDark: '#0068FF',
  primaryLight: '#66B3FF',
  secondary: '#3399FF',
  secondaryDark: '#0068FF',
  secondaryLight: '#66B3FF',
  background: {
    primary: '#1C1C1E',
    secondary: '#2C2C2E',
    tertiary: '#3A3A3C',
    chatBg: '#2C2C2E',
    tabBar: '#1C1C1E',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#ABABAB',
    tertiary: '#8E8E93',
    placeholder: '#6E6E6E',
    inverse: '#1A1A1A',
    link: '#3399FF',
  },
  border: {
    default: '#3A3A3C',
    light: '#2C2C2E',
    focus: '#3399FF',
  },
  shadow: {
    light: 'rgba(0, 0, 0, 0.30)',
    medium: 'rgba(0, 0, 0, 0.40)',
    heavy: 'rgba(0, 0, 0, 0.55)',
  },
};

export const colors = lightColors;
