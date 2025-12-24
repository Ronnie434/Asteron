import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Home, PlusCircle, Calendar, Settings, HelpCircle } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { theme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const iconMap: { [key: string]: typeof Home } = {
  brief: Home,
  capture: PlusCircle,
  upcoming: Calendar,
  settings: Settings,
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const bottomOffset = Math.max(insets.bottom, 20);

  return (
    // pointerEvents="box-none" allows touches to pass through the outer wrapper
    // but the inner Pressables can still receive touches
    <View
      style={[styles.wrapper, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <View style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(28, 28, 30, 0.85)' : 'rgba(255, 255, 255, 0.70)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
        }
      ]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const handlePress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const IconComponent = iconMap[route.name] || HelpCircle;

          return (
            <Pressable
              key={route.key}
              onPress={handlePress}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && styles.tabItemPressed
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={[
                styles.iconWrapper,
                isFocused && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.primaryLight },
              ]}>
                <IconComponent
                  size={26}
                  color={isFocused ? colors.primary : colors.textTertiary}
                  strokeWidth={2}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    width: width * 0.9,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    // Border for glassmorphism effect
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabItemPressed: {
    opacity: 0.6,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: theme.colors.primaryLight,
  },
});
