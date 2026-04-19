import { FC, ReactNode } from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { typography } from '@theme';

type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'subtitle'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'button';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  children: ReactNode;
}

const AppText: FC<AppTextProps> = ({
  variant = 'body',
  color,
  bold,
  italic,
  style,
  children,
  ...props
}) => {
  const getVariantStyle = (): TextStyle => {
    const variantStyle = typography[variant] || typography.body;
    return {
      ...variantStyle,
      fontWeight: bold ? '700' : variantStyle.fontWeight,
      fontStyle: italic ? 'italic' : 'normal',
    };
  };

  return (
    <Text
      style={[getVariantStyle(), color && { color }, style]}
      {...props}
    >
      {children}
    </Text>
  );
};

export default AppText;