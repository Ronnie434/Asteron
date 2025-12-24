import 'react-native-get-random-values';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, PlusCircle, Calendar, Settings } from 'lucide-react-native';
import { theme } from '../src/ui/theme';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

const TAB_ROUTES = [
  { name: 'brief', path: '/(tabs)/brief', Icon: Home },
  { name: 'capture', path: '/(tabs)/capture', Icon: PlusCircle },
  { name: 'upcoming', path: '/(tabs)/upcoming', Icon: Calendar },
  { name: 'settings', path: '/(tabs)/settings', Icon: Settings },
];

function AppContent() {
  const { isDark, colors } = useTheme();
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
            headerTitleStyle: {
              color: colors.text,
              fontFamily: 'Manrope_700Bold',
            },
        }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="confirm" options={{ presentation: 'modal', title: 'Confirm' }} />
          <Stack.Screen 
            name="voice" 
            options={{ 
              title: 'Voice Input',
               headerTitleStyle: {
                fontFamily: 'Manrope_700Bold',
                fontSize: 17,
                color: colors.text,
              },
              headerBackButtonDisplayMode: 'minimal',
            }} 
          />
        </Stack>
        
        {/* Floating Tab Bar - rendered OUTSIDE the navigation stack */}
        <FloatingTabBar />
      </View>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function FloatingTabBar() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const bottomOffset = Math.max(insets.bottom, 20);
  const pathname = usePathname();
  const router = useRouter();

  // All hooks must be called before any conditional returns
  const handleTabPress = useCallback((path: string) => {
    router.push(path as any);
  }, [router]);

  // Determine which tab is active
  const activeTab = TAB_ROUTES.find(route =>
    pathname === `/${route.name}` ||
    pathname === route.path ||
    pathname.startsWith(`/${route.name}/`) ||
    pathname.startsWith(`${route.path}/`)
  )?.name || 'brief';

  // Hide on voice and confirm screens
  if (pathname === '/voice' || pathname === '/confirm') {
    return null;
  }

  return (
    <View
      style={[styles.tabBarWrapper, { bottom: bottomOffset }]}
      pointerEvents="auto"
    >
      <View style={[
        styles.tabBarContainer, 
        { 
          backgroundColor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)',
        }
      ]}>
        {TAB_ROUTES.map((route) => (
          <Pressable
            key={route.name}
            onPress={() => handleTabPress(route.path)}
            style={({ pressed }) => [
              styles.tabItem,
              pressed && styles.tabItemPressed,
            ]}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            android_ripple={{ color: 'rgba(0, 122, 255, 0.2)', borderless: true }}
          >
            <View style={[
              styles.iconWrapper,
              activeTab === route.name && { backgroundColor: colors.primaryLight },
            ]}>
              <route.Icon
                size={26}
                color={activeTab === route.name ? colors.primary : colors.textTertiary}
                strokeWidth={2}
              />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    // On iOS 18, zIndex alone isn't enough - we need proper view hierarchy
    zIndex: 99999,
    elevation: 99999,
  },
  tabBarContainer: {
    width: width * 0.9,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    // Border for glassmorphism effect
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    // Ensure touch target is large enough
    minHeight: 48,
    minWidth: 48,
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