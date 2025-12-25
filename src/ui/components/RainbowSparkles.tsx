import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
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
/**
 * AI Sparkles icon with a beautiful rainbow gradient effect.
 * Uses MaskedView to apply a gradient to the Lucide Sparkles icon.
 */
export function RainbowSparkles({ size = 24, strokeWidth = 2 }: RainbowSparklesProps) {
  const scrollX = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Animate the gradient position to create a color shifting effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(scrollX, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true, // Use transform for better performance
        }),
        Animated.timing(scrollX, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  // Map 0-1 to translation
  const translateX = scrollX.interpolate({
    inputRange: [0, 1],
    outputRange: [-size * 0.5, 0], // Move back and forth
  });

  return (
    <MaskedView
      style={{ width: size, height: size }}
      maskElement={
        <View style={styles.maskContainer}>
          <Sparkles size={size} color="#000" strokeWidth={strokeWidth} />
        </View>
      }
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: -size * 0.5,
          left: -size * 0.5,
          width: size * 2, // Double width for movement
          height: size * 2,
          transform: [{ translateX }, { rotate: '45deg' }], // Rotate to make it diagonal
        }}
      >
        <LinearGradient
          colors={[
            '#FF6B6B', // Coral Red
            '#FF8E53', // Orange
            '#FECA57', // Yellow
            '#48DBFB', // Sky Blue
            '#A29BFE', // Lavender
            '#FF6B9D', // Pink
            '#FF6B6B', // Loop back to Red
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
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
