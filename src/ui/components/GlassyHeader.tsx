import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';
import { theme } from '../theme';
import { Typography } from './Typography';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';


const { width } = Dimensions.get('window');

interface GlassyHeaderProps {
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
  style?: any;
  disableTopSafeArea?: boolean;
}

export function GlassyHeader({ 
  title, 
  onBack, 
  showBack,
  leftAction, 
  rightAction, 
  children,
  style,
  disableTopSafeArea = false
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

  return (
    <BlurView
      intensity={80}
      tint={isDark ? 'dark' : 'light'}
      style={[
        styles.container, 
        { 
          paddingTop: disableTopSafeArea ? 0 : insets.top,
          borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        },
        style
      ]}
    >
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
  content: {
    height: 60, // Increased header height for better vertical spacing
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md, // Balanced vertical padding
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
