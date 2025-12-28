import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';

interface RainbowSparklesProps {
  size?: number;
  strokeWidth?: number;
}

/**
 * AI Sparkles icon with a beautiful rainbow gradient effect.
 * Uses MaskedView to apply a gradient to the Lucide Sparkles icon.
 */
export function RainbowSparkles({ size = 24, strokeWidth = 2 }: RainbowSparklesProps) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    // Animate the gradient position to create a color shifting effect
    translateX.value = withRepeat(
      withTiming(-size, {
        duration: 3000,
        easing: Easing.linear,
      }),
      -1, // Infinite repeat
      false // Do not reverse
    );
  }, [size]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Reusing colors from RainbowText for consistency
  const colors = [
    '#F87171', // Red
    '#FBBF24', // Yellow
    '#34D399', // Green
    '#60A5FA', // Blue
    '#A78BFA', // Purple
    '#F472B6', // Pink
    '#F87171', // Red (Repeat for loop)
    '#FBBF24', // Yellow (Repeat for loop)
    '#34D399', // Green (Repeat for loop)
    '#60A5FA', // Blue (Repeat for loop)
    '#A78BFA', // Purple (Repeat for loop)
    '#F472B6', // Pink (Repeat for loop)
  ];

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
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width: size * 3, // Wide enough to slide
            height: size,
            flexDirection: 'row',
          },
          animatedStyle
        ]}
      >
        <LinearGradient
          colors={colors as [string, string, ...string[]]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
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
