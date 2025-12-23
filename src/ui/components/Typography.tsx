import { Text, TextProps, StyleSheet } from 'react-native';
import { theme } from '../theme';

type TypographyVariant = keyof typeof theme.typography;

interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
}

export function Typography({
  variant = 'body',
  color = theme.colors.text,
  style,
  ...props
}: TypographyProps) {
  return (
    <Text
      style={[
        theme.typography[variant],
        { color },
        style,
      ]}
      {...props}
    />
  );
}
