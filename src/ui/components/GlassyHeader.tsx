import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useTheme } from '../../contexts/ThemeContext';
import { theme } from '../theme';
import { Typography } from './Typography';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

interface GlassyHeaderProps {
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
  style?: any;
  disableTopSafeArea?: boolean;
  /** Floating pill style for modals - fully rounded with horizontal margins */
  isFloatingPill?: boolean;
  /** Modal sheet presentation (compact spacing) vs fullscreen modal (needs safe area) */
  isModalSheet?: boolean;
}

export function GlassyHeader({ 
  title, 
  onBack, 
  showBack,
  leftAction, 
  rightAction, 
  children,
  style,
  disableTopSafeArea = false,
  isFloatingPill = false,
  isModalSheet = false
}: GlassyHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const containerStyle = [
    isFloatingPill ? styles.floatingContainer : styles.container, 
    { 
      // For floating pill: modal sheets use compact 8px, fullscreen modals use safe area + 12px
      ...(isFloatingPill ? {
        top: isModalSheet ? 8 : (insets.top + 12),
      } : {
        paddingTop: disableTopSafeArea ? 0 : insets.top,
        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      }),
      // Fallback styles for non-iOS 26 devices
      ...(!isLiquidGlassSupported && {
        backgroundColor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.98)',
      }),
    },
    style
  ];

  const headerContent = (
    <View style={styles.content}>
      <View style={styles.leftContainer}>
        {leftAction ? leftAction : (
          showBack ? (
            <TouchableOpacity 
              onPress={handleBack} 
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ) : children
        )}
      </View>

      {title && (
        <View style={styles.titleContainer}>
          <Typography variant="headline" numberOfLines={1} style={{ textAlign: 'center' }}>
            {title}
          </Typography>
        </View>
      )}

      <View style={styles.rightContainer}>
        {rightAction}
      </View>
    </View>
  );

  // Use LiquidGlassView on iOS 26+, BlurView as fallback
  if (isLiquidGlassSupported) {
    return (
      <LiquidGlassView
        style={containerStyle}
        effect="clear"
        colorScheme={isDark ? 'dark' : 'light'}
        tintColor={isDark ? undefined : '#F2F2F7'}
        interactive
      >
        {headerContent}
      </LiquidGlassView>
    );
  }

  return (
    <BlurView
      intensity={80}
      tint={isDark ? 'dark' : 'light'}
      style={containerStyle}
    >
      {headerContent}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  floatingContainer: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 100,
    borderRadius: 32,
    overflow: 'hidden',
    // Shadow for floating effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  leftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  titleContainer: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  backButton: {
    marginRight: theme.spacing.sm,
  },
});
