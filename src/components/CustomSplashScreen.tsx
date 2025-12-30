import React from 'react';
import { View, Image, StyleSheet, useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../ui/theme';

/**
 * A custom splash screen component that displays the app logo centered.
 * This is used for React-based loading states (hot reloads, etc.).
 * The native splash screen handles cold starts.
 */
export const CustomSplashScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const backgroundColor = isDark ? darkColors.background : lightColors.background;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/AI_Companion_icon.png')}
          style={styles.logo}
          resizeMode="cover"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 400,
    height: 400,
    borderRadius: 100,
    overflow: 'hidden',
  },
  logo: {
    width: 400,
    height: 400,
  },
});
