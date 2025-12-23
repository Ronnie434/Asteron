import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { theme } from '../theme';

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
  return (
    <View 
      style={[
        styles.card,
        variant === 'inset' && styles.inset,
        variant === 'plain' && styles.plain,
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
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.card,
  },
  inset: {
    backgroundColor: theme.colors.surfaceSecondary,
    ...theme.shadows.card,
  },
  plain: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
});
