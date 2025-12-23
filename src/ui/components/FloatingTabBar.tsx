import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { theme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
  brief: 'home',
  capture: 'add-circle',
  upcoming: 'calendar',
  settings: 'settings',
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 20);

  console.log('[FloatingTabBar] Rendering with bottomOffset:', bottomOffset);

  return (
    // pointerEvents="box-none" allows touches to pass through the outer wrapper
    // but the inner Pressables can still receive touches
    <View
      style={[styles.wrapper, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const handlePress = () => {
            console.log('[FloatingTabBar] TAB PRESSED:', route.name);
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              console.log('[FloatingTabBar] Navigating to:', route.name);
              navigation.navigate(route.name, route.params);
            }
          };

          const iconName = iconMap[route.name] || 'help-circle';

          return (
            <Pressable
              key={route.key}
              onPress={handlePress}
              onPressIn={() => console.log('[FloatingTabBar] onPressIn:', route.name)}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && styles.tabItemPressed
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={[
                styles.iconWrapper,
                isFocused && styles.iconWrapperActive,
              ]}>
                <Ionicons
                  name={iconName}
                  size={26}
                  color={isFocused ? theme.colors.primary : theme.colors.textTertiary}
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    borderColor: 'rgba(255, 255, 255, 0.8)',
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
