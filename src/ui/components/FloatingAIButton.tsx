import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useTheme } from '../../contexts/ThemeContext';
import { useCapture } from '../../contexts/CaptureContext';
import { LiveSparkles } from './LiveSparkles';

interface FloatingAIButtonProps {
  /** Whether to hide the button (e.g., when modal is open) */
  hidden?: boolean;
}

/**
 * Floating AI sparkle button that appears in the bottom-right corner of screens.
 * Opens the full-screen AI chat modal when pressed.
 */
export function FloatingAIButton({ hidden = false }: FloatingAIButtonProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { openCapture } = useCapture();

  if (hidden) return null;

  // Position same as Notes FAB button (insets.bottom + 100)
  const bottomOffset = insets.bottom + 100;

  const buttonContent = (
    <TouchableOpacity
      onPress={openCapture}
      activeOpacity={0.8}
      style={styles.touchable}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <LiveSparkles size={28} />
    </TouchableOpacity>
  );

  // Use LiquidGlassView on iOS 26+, fallback for older devices
  if (isLiquidGlassSupported) {
    return (
      <LiquidGlassView
        style={[
          styles.container,
          { bottom: bottomOffset, right: 16 }
        ]}
        effect="clear"
        colorScheme={isDark ? 'dark' : 'light'}
        tintColor={isDark ? undefined : '#F2F2F7'}
      >
        {buttonContent}
      </LiquidGlassView>
    );
  }

  return (
    <View
      style={[
        styles.container,
        styles.fallbackContainer,
        {
          bottom: bottomOffset,
          right: 16,
          backgroundColor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)',
        }
      ]}
    >
      {buttonContent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99998,
    elevation: 99998,
    overflow: 'hidden',
  },
  fallbackContainer: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  touchable: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
