import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  colors?: string[];
}

export function GradientBackground({ 
  children, 
  style,
  colors = theme.gradients.background,
}: GradientBackgroundProps) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
