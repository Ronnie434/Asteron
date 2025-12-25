import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { RainbowSparkles } from './RainbowSparkles';
import { useTheme } from '../../contexts/ThemeContext';

interface LiveSparklesProps {
  size?: number;
}

/**
 * Animated wrapper for RainbowSparkles that adds a "live" breathing and floating effect.
 * Uses standard React Native Animated to avoid Reanimated worklet version mismatches.
 */
export function LiveSparkles({ size = 48 }: LiveSparklesProps) {
  const { isDark } = useTheme();
  
  // Animation values
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Breathing effect (scale)
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Floating effect (up and down)
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -8,
          duration: 2500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle rotation (wobble)
    const wobble = Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, {
          toValue: 1, // 1 represents ~5deg
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: -1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel([breathe, float, wobble]).start();

    return () => {
      scale.stopAnimation();
      translateY.stopAnimation();
      rotate.stopAnimation();
    };
  }, []);

  // Interpolate rotation value to degrees
  const rotateStr = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-5deg', '5deg'],
  });

  // Derived glow opacity
  const glowOpacity = scale.interpolate({
    inputRange: [1, 1.15],
    outputRange: [0, 0.5],
  });

  const glowScale = scale.interpolate({
    inputRange: [1, 1.15],
    outputRange: [1.2, 1.8],
  });

  return (
    <View style={styles.container}>
      {/* Background Glow (Dark Mode only) */}
      {isDark && (
        <Animated.View 
          style={[
            styles.glow, 
            { 
              opacity: glowOpacity,
              transform: [{ scale: glowScale }]
            }
          ]} 
        />
      )}
      
      <Animated.View style={{
        transform: [
          { scale },
          { translateY },
          { rotate: rotateStr }
        ]
      }}>
        <RainbowSparkles size={size} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(72, 219, 251, 0.4)', // Light blue glow
    shadowColor: '#48DBFB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  }
});
