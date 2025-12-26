import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Dimensions, Animated, Easing } from 'react-native';
import { theme } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Confetti colors based on the screenshot (lilac/purple theme)
const COLORS = [
  '#E9D5FF', // Light lilac
  '#C084FC', // Medium purple
  '#A855F7', // Purple
  '#7E22CE', // Dark purple
  '#F3E8FF', // Very light lilac
  '#FFFFFF', // White
];

const PARTICLE_COUNT = 40; // Reduced slightly for JS-thread performance

interface ParticleProps {
  index: number;
}

const Particle = ({ index }: ParticleProps) => {
  // Randomize initial position
  const initialX = Math.random() * SCREEN_WIDTH;
  const initialY = -50 - Math.random() * 100; // Start above screen

  // Target position
  const targetY = SCREEN_HEIGHT * 0.4 + Math.random() * SCREEN_HEIGHT * 0.5;
  const targetX = initialX + (Math.random() - 0.5) * 150; // Drift

  // Animation values
  const animValue = useRef(new Animated.Value(0)).current;

  // Random characteristics
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const size = 6 + Math.random() * 8;
  const isCircle = Math.random() > 0.6;
  const duration = 2000 + Math.random() * 1500;
  const delay = Math.random() * 200;
  const maxRotation = 360 + Math.random() * 360;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(animValue, {
        toValue: 1,
        duration: duration,
        useNativeDriver: true, // Native driver is smoother for transform/opacity
        easing: Easing.out(Easing.quad),
      })
    ]).start();
  }, []);

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [initialX, targetX]
  });

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [initialY, targetY]
  });

  const rotate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${maxRotation}deg`]
  });

  const scale = animValue.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0.5] // Pop in then shrink slightly
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 1, 1, 0] // Fade out at end
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: isCircle ? size : size * 0.6,
          borderRadius: isCircle ? size / 2 : 2,
          backgroundColor: color,
          opacity,
          transform: [
            { translateX },
            { translateY },
            { rotate },
            { scale }
          ]
        },
      ]}
    />
  );
};

interface TaskCelebrationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export const TaskCelebration = ({ isVisible, onComplete }: TaskCelebrationProps) => {
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    if (isVisible) {
      // Generate particles
      setParticles(Array.from({ length: PARTICLE_COUNT }, (_, i) => i));

      // Auto dismiss/cleanup after animation
      const timeout = setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
        setParticles([]);
      }, 4000); 

      return () => clearTimeout(timeout);
    } else {
      setParticles([]);
    }
  }, [isVisible]);

  if (!isVisible && particles.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
         {particles.map((i) => (
             <Particle key={i} index={i} />
         ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    // We don't want background color, just transparent overlay
  },
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
