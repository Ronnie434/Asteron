import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';

interface RainbowSparklesProps {
  size?: number;
  strokeWidth?: number;
}

/**
 * AI Sparkles icon with a beautiful rainbow gradient effect.
 * Uses MaskedView to apply a gradient to the Lucide Sparkles icon.
 */
export function RainbowSparkles({ size = 24, strokeWidth = 2 }: RainbowSparklesProps) {
  return (
    <MaskedView
      style={{ width: size, height: size }}
      maskElement={
        <View style={styles.maskContainer}>
          <Sparkles size={size} color="#000" strokeWidth={strokeWidth} />
        </View>
      }
    >
      <LinearGradient
        colors={[
          '#FF6B6B', // Coral Red
          '#FF8E53', // Orange
          '#FECA57', // Yellow
          '#48DBFB', // Sky Blue
          '#A29BFE', // Lavender
          '#FF6B9D', // Pink
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size }}
      />
    </MaskedView>
  );
}

/**
 * Alternative AI Sparkles with a sleek purple-to-pink gradient.
 * More subtle and professional looking.
 */
export function GradientSparkles({ size = 24, strokeWidth = 2 }: RainbowSparklesProps) {
  return (
    <MaskedView
      style={{ width: size, height: size }}
      maskElement={
        <View style={styles.maskContainer}>
          <Sparkles size={size} color="#000" strokeWidth={strokeWidth} />
        </View>
      }
    >
      <LinearGradient
        colors={[
          '#6366F1', // Indigo
          '#8B5CF6', // Violet
          '#EC4899', // Pink
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size }}
      />
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  maskContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
