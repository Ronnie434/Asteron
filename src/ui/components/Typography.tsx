import { Text, TextProps, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { useTheme } from '../../contexts/ThemeContext';

type TypographyVariant = keyof typeof theme.typography;

interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
}

export function Typography({
  variant = 'body',
  color,
  style,
  ...props
}: TypographyProps) {
  const { colors } = useTheme();
  
  // Use provided color, or default to theme text color
  const textColor = color ?? colors.text;
  
  return (
    <Text
      style={[
        theme.typography[variant],
        { color: textColor },
        style,
      ]}
      {...props}
    />
  );
}
