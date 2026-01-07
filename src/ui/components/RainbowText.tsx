import React, { useEffect, useState } from 'react';
import { Text, TextStyle, View, StyleSheet, LayoutChangeEvent, ViewStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing,
} from 'react-native-reanimated';

interface RainbowTextProps {
  text: string;
  textStyle?: TextStyle | TextStyle[];
  containerStyle?: ViewStyle;
}

export function RainbowText({ text, textStyle, containerStyle }: RainbowTextProps) {
  const translateX = useSharedValue(0);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (dimensions && dimensions.width > 0) {
      translateX.value = 0;
      translateX.value = withRepeat(
        withTiming(-dimensions.width, {
          duration: 3000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }
  }, [dimensions]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      // Add small buffer and ceil to prevent sub-pixel clipping
      setDimensions({ 
        width: Math.ceil(width), 
        height: Math.ceil(height) + 4 
      });
    }
  };

  // Pastel/Modern Rainbow Colors
  const colors: [string, string, ...string[]] = [
    '#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
    '#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6',
  ];

  return (
    <View style={containerStyle}>
      {/* Transparent placeholder - establishes layout */}
      <Text 
        style={[textStyle, { color: 'transparent' }]} 
        onLayout={onLayout}
      >
        {text}
      </Text>

      {/* MaskedView overlay */}
      {dimensions && (
        <MaskedView
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: dimensions.width,
            height: dimensions.height,
          }}
          maskElement={
            <View style={{ width: dimensions.width, height: dimensions.height }}>
               <Text style={[textStyle, { width: dimensions.width }]}>{text}</Text>
            </View>
          }
        >
          <Animated.View 
            style={[
              { width: dimensions.width * 2, height: dimensions.height },
              animatedStyle
            ]}
          >
            <LinearGradient
              colors={colors}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </MaskedView>
      )}
    </View>
  );
}
