import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Pressable, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { Home, PlusCircle, Calendar, Settings, FileText } from 'lucide-react-native';
import { theme } from '../src/ui/theme';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { CaptureProvider, useCapture } from '../src/contexts/CaptureContext';
import { NotificationService } from '../src/services/NotificationService';
import { useAuthStore } from '../src/store/useAuthStore';
import { CustomSplashScreen } from '../src/components/CustomSplashScreen';
import OnboardingScreen from './onboarding';
import SignInScreen from './signin';
import CaptureScreen from './(tabs)/capture';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

const TAB_ROUTES = [
  { name: 'brief', path: '/(tabs)/brief', Icon: Home },
  { name: 'upcoming', path: '/(tabs)/upcoming', Icon: Calendar },
  { name: 'capture', path: 'CAPTURE_OVERLAY', Icon: PlusCircle }, // Special handler for capture
  { name: 'notes', path: '/(tabs)/notes', Icon: FileText },
  { name: 'settings', path: '/(tabs)/settings', Icon: Settings },
];

function MainAppContent() {
  const { isDark, colors } = useTheme();
  const pathname = usePathname();
  const { isCaptureOpen, closeCapture } = useCapture();
  
  // Determine if tab bar should be shown (hide during modals)
  const shouldShowTabBar = !(pathname === '/edit' || pathname === '/note-detail');
  
  return (
    <>
      {/* Capture Screen - Rendered OUTSIDE the navigation infrastructure */}
      {isCaptureOpen && (
        <View style={StyleSheet.absoluteFill}>
          <SafeAreaProvider>
            <CaptureScreen onClose={closeCapture} />
            <StatusBar style={isDark ? 'light' : 'dark'} />
          </SafeAreaProvider>
        </View>
      )}
      
      {/* Main App - Hidden when capture is open */}
      {!isCaptureOpen && (
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{
                headerStyle: {
                  backgroundColor: colors.background,
                },
                headerTintColor: colors.text,
                headerTitleStyle: {
                  color: colors.text,
                  ...theme.typography.title3,
                },
            }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen 
                name="edit" 
                options={{ 
                  presentation: 'modal',
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="note-detail" 
                options={{ 
                  presentation: 'modal',
                  headerShown: false,
                }} 
              />
            </Stack>
            
            {/* Floating Tab Bar */}
            {shouldShowTabBar && <FloatingTabBar />}
          </View>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </GestureHandlerRootView>
      )}
    </>
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

  if (!fontsLoaded) {
    return <CustomSplashScreen />;
  }

  // Wrap entire app in ThemeProvider so all routes (even pre-rendered) have access
  return (
    <ThemeProvider>
      <AuthenticatedApp />
    </ThemeProvider>
  );
}

function AuthenticatedApp() {
  const appState = useRef(AppState.currentState);
  
  // Onboarding state - null = loading, true = completed, false = needs onboarding
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  
  // Auth state
  const { session, isLoading: isAuthLoading, isInitialized, initialize, isGuestMode } = useAuthStore();

  // Check onboarding status on mount
  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding').then(value => {
      setHasSeenOnboarding(value === 'true');
    });
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      await NotificationService.requestPermissions();
    };
    
    initNotifications();

    const notificationSubscription = require('expo-notifications').addNotificationReceivedListener(
      async (notification: any) => {
        const itemId = notification.request.content.data?.itemId;
        if (itemId) {
          const { useItemsStore } = require('../src/store/useItemsStore');
          const items = useItemsStore.getState().items;
          const item = items.find((i: any) => i.id === itemId || notification.request.identifier.startsWith(i.id));
          
          if (item && item.repeat && item.repeat !== 'none') {
            await NotificationService.extendNextOccurrence(item, 7);
          }
        }
      }
    );

    return () => {
      notificationSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (hasSeenOnboarding !== null && isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [hasSeenOnboarding, isInitialized]);

  // Handle onboarding completion
  const handleOnboardingComplete = useCallback(async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    setHasSeenOnboarding(true);
  }, []);

  // Loading state - wait for onboarding check AND auth initialization
  if (hasSeenOnboarding === null || !isInitialized) {
    return <CustomSplashScreen />;
  }

  // CRITICAL: Render onboarding COMPLETELY OUTSIDE the navigation infrastructure
  if (!hasSeenOnboarding) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  // Show sign-in screen if not authenticated AND not in guest mode
  if (!session && !isGuestMode) {
    return (
      <SafeAreaProvider>
        <SignInScreen />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  // Normal app with navigation - wrapped in CaptureProvider
  return (
    <CaptureProvider>
      <MainAppContent />
    </CaptureProvider>
  );
}

function FloatingTabBar() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const bottomOffset = Math.max(insets.bottom, 20);
  const pathname = usePathname();
  const router = useRouter();
  const { openCapture } = useCapture();

  const handleTabPress = useCallback((route: typeof TAB_ROUTES[0]) => {
    if (route.path === 'CAPTURE_OVERLAY') {
      // Open capture as overlay instead of navigation
      openCapture();
    } else {
      router.push(route.path as any);
    }
  }, [router, openCapture]);

  const activeTab = TAB_ROUTES.find(route =>
    pathname === `/${route.name}` ||
    pathname === route.path ||
    pathname.startsWith(`/${route.name}/`) ||
    pathname.startsWith(`${route.path}/`)
  )?.name || 'brief';

  return (
    <View
      style={[styles.tabBarWrapper, { bottom: bottomOffset }]}
      pointerEvents="box-none"
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
            onPress={() => handleTabPress(route)}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
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