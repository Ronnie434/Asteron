import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
  style?: any;
}

export function GlassyHeader({ 
  title, 
  onBack, 
  showBack, 
  rightAction, 
  children,
  style 
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
    <View 
      style={[
        styles.container, 
        { 
          paddingTop: insets.top,
          backgroundColor: isDark ? 'rgba(28, 28, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
        },
        style
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftContainer}>
          {showBack && (
            <TouchableOpacity 
              onPress={handleBack} 
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
          {children && !title ? children : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
  },
  content: {
    height: 54, // Standard header height
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
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
