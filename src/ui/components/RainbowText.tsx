import React, { useEffect } from 'react';
import { Text, TextStyle, View, StyleSheet, LayoutChangeEvent, ViewStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing,
  SharedValue 
} from 'react-native-reanimated';

interface RainbowTextProps {
  text: string;
  textStyle?: TextStyle | TextStyle[];
  containerStyle?: ViewStyle;
}

export function RainbowText({ text, textStyle, containerStyle }: RainbowTextProps) {
  const translateX = useSharedValue(0);
  const [width, setWidth] = React.useState(0);

  useEffect(() => {
    if (width > 0) {
      translateX.value = withRepeat(
        withTiming(-width, {
          duration: 3000,
          easing: Easing.linear,
        }),
        -1, // Infinite repeat
        false // Do not reverse
      );
    }
  }, [width]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const onLayout = (event: LayoutChangeEvent) => {
    if (width === 0) {
      setWidth(event.nativeEvent.layout.width);
    }
  };

  // Pastel/Modern Rainbow Colors
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
    <View style={[styles.container, containerStyle]}>
      {/* Invisible text to establish layout size */}
      <Text 
        style={[textStyle, { opacity: 0 }]}
        onLayout={onLayout}
      >
        {text}
      </Text>

      {width > 0 && (
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <View style={styles.maskContainer}>
              <Text style={textStyle}>
                {text}
              </Text>
            </View>
          }
        >
          <Animated.View style={[styles.gradientContainer, { width: width * 2 }, animatedStyle]}>
            <LinearGradient
              colors={colors as [string, string, ...string[]]}
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

const styles = StyleSheet.create({
  container: {
    // Container behaves like the text element
  },
  maskContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientContainer: {
    height: '100%',
    flexDirection: 'row',
  },
});
