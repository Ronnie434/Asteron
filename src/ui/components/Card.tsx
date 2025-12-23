import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps extends ViewProps {
  variant?: 'default' | 'inset' | 'plain';
  children: React.ReactNode;
}

export function Card({ 
  variant = 'default',
  style, 
  children, 
  ...props 
}: CardProps) {
  const { colors } = useTheme();
  
  return (
    <View 
      style={[
        styles.card,
        { backgroundColor: variant === 'plain' ? 'transparent' : colors.card },
        variant === 'inset' && { backgroundColor: colors.surfaceSecondary },
        style,
      ]} 
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.card,
  },
});
