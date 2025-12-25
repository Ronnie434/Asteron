import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface WaveformProps {
  active?: boolean;
  color?: string;
  count?: number;
}

export function Waveform({ active = false, color, count = 24 }: WaveformProps) {
  const { colors } = useTheme();
  const barColor = color || colors.textSecondary;
  const bars = Array.from({ length: count });

  return (
    <View style={styles.container}>
      {bars.map((_, i) => (
        <WaveformBar
          key={i}
          index={i}
          active={active}
          color={barColor}
          total={count}
        />
      ))}
    </View>
  );
}

function WaveformBar({
  index,
  active,
  color,
  total
}: {
  index: number;
  active: boolean;
  color: string;
  total: number;
}) {
  const height = useRef(new Animated.Value(4)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      // Random animation loop simulating voice
      const randomHeight = 8 + Math.random() * 24;
      const duration = 250 + Math.random() * 200;

      opacity.setValue(1);
      
      const animate = () => {
        animationRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(height, {
              toValue: randomHeight,
              duration,
              useNativeDriver: false,
            }),
            Animated.timing(height, {
              toValue: 4,
              duration,
              useNativeDriver: false,
            }),
          ])
        );
        animationRef.current.start();
      };
      
      const delay = Math.random() * 100;
      const timeout = setTimeout(animate, delay);
      
      return () => {
        clearTimeout(timeout);
        animationRef.current?.stop();
      };
    } else {
      animationRef.current?.stop();
      Animated.timing(height, {
        toValue: 4,
        duration: 200,
        useNativeDriver: false,
      }).start();
      Animated.timing(opacity, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [active]);

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          height,
          opacity,
          backgroundColor: color
        }
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 2,
    flex: 1,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
  },
});
