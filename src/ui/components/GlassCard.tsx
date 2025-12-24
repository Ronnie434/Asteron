import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '../theme';

interface GlassCardProps extends ViewProps {
  intensity?: number;
  children: React.ReactNode;
}

export function GlassCard({ 
  style, 
  intensity = 20, 
  children, 
  ...props 
}: GlassCardProps) {
  return (
    <View style={[styles.container, style]} {...props}>
      <BlurView 
        intensity={intensity} 
        tint="dark" 
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        {children}
      </View>
      {/* Glass highlight effect */}
      <View style={styles.highlight} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: theme.colors.glass,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    borderRadius: theme.borderRadius.lg,
  },
  content: {
    padding: theme.spacing.lg,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.colors.glassHighlight,
  },
});
