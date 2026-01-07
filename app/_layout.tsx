import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, usePathname, useRouter, useSegments, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Pressable, AppState } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { Home, Calendar, Settings, FileText } from 'lucide-react-native';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { theme } from '../src/ui/theme';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { CaptureProvider, useCapture } from '../src/contexts/CaptureContext';
import { NotificationService } from '../src/services/NotificationService';
import { setupPreferenceSyncListener } from '../src/services/preferenceSyncService';
import { useAuthStore } from '../src/store/useAuthStore';
import { useChatStore } from '../src/store/useChatStore';
import { LoadingScreen } from '../src/components/LoadingScreen';
import CaptureScreen from './(tabs)/capture';
import { useResponsive } from '../src/ui/useResponsive';
import { FloatingAIButton } from '../src/ui/components/FloatingAIButton';

SplashScreen.preventAutoHideAsync();

const TAB_ROUTES = [
  { name: 'brief', path: '/(tabs)/brief', Icon: Home },
  { name: 'upcoming', path: '/(tabs)/upcoming', Icon: Calendar },
  { name: 'notes', path: '/(tabs)/notes', Icon: FileText },
  { name: 'settings', path: '/(tabs)/settings', Icon: Settings },
];

function MainAppContent() {
  const { isDark, colors } = useTheme();
  const pathname = usePathname();
  const { isCaptureOpen, closeCapture } = useCapture();
  const { height: screenHeight } = Dimensions.get('window');
  
  // Animation for bottom sheet slide-up
  const translateY = useSharedValue(screenHeight);
  
  useEffect(() => {
    translateY.value = withSpring(isCaptureOpen ? 0 : screenHeight, {
      damping: 25,
      stiffness: 300,
      mass: 0.8,
    });
  }, [isCaptureOpen]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  
  // Determine if tab bar and floating button should be shown (hide during modals and on capture screen)
  const shouldShowUI = !(pathname === '/edit' || pathname === '/note-detail' || pathname.includes('capture') || pathname === '/onboarding' || pathname === '/signin');
  
  return (
    <>
      {/* Main App - ALWAYS MOUNTED to preserve hooks */}
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
            {/* All screens registered without guards - index.tsx handles routing */}
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="signin" options={{ headerShown: false }} />
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
          {shouldShowUI && <FloatingTabBar />}
          
          {/* Floating AI Button */}
          {shouldShowUI && <FloatingAIButton hidden={isCaptureOpen} />}
        </View>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </GestureHandlerRootView>
      
      {/* Full Screen Modal for AI Chat */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill,
          { zIndex: 100000 },
          animatedStyle
        ]}
        pointerEvents={isCaptureOpen ? 'auto' : 'none'}
      >
        <SafeAreaProvider>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <CaptureScreen onClose={closeCapture} />
          </View>
        </SafeAreaProvider>
      </Animated.View>
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

  // ALWAYS render ThemeProvider and AuthenticatedApp - no conditional returns
  // This keeps the component tree stable and prevents hooks violations
  return (
    <ThemeProvider>
      <AuthenticatedApp fontsLoaded={fontsLoaded} />
    </ThemeProvider>
  );
}

function AuthenticatedApp({ fontsLoaded }: { fontsLoaded: boolean }) {
  const appState = useRef(AppState.currentState);
  const backgroundTimerRef = useRef<number | null>(null);
  
  // Auth state
  const { session, isLoading: isAuthLoading, isInitialized, initialize, isGuestMode } = useAuthStore();

  // Determine if app is fully ready
  const isAppReady = fontsLoaded && isInitialized;

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auth Navigation Protection
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(tabs)' || segments[0] === 'edit' || segments[0] === 'note-detail';
    const inPublicGroup = segments[0] === 'signin' || segments[0] === 'onboarding' || segments.length === 0;

    if ((session || isGuestMode) && inPublicGroup) {
      // User is signed in but on a public screen -> Redirect to App
      console.log('Auth Protection: Redirecting to Brief');
      router.replace('/(tabs)/brief');
    } else if (!session && !isGuestMode && inAuthGroup) {
      // User is not signed in but on a protected screen -> Redirect to Sign In
      console.log('Auth Protection: Redirecting to Sign In');
      router.replace('/signin');
    }
  }, [session, isGuestMode, isInitialized, segments]);

  // Initialize notifications (only when app is ready)
  useEffect(() => {
    if (!isAppReady) return;
    
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
  }, [isAppReady]);

  // Clear chat history after 2 minutes in background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // App is going to background
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // Start 2-minute timer to clear chat history
        backgroundTimerRef.current = setTimeout(() => {
          console.log('Clearing chat history after 2 minutes in background');
          useChatStore.getState().clearSession();
        }, 120000); // 2 minutes = 120000ms
      }
      
      // App is returning to foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // Cancel the timer if app returns before 2 minutes
        if (backgroundTimerRef.current) {
          clearTimeout(backgroundTimerRef.current);
          backgroundTimerRef.current = null;
        }
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      if (backgroundTimerRef.current) {
        clearTimeout(backgroundTimerRef.current);
      }
    };
  }, []);

  // Setup preference sync listener (syncs email brief settings to Supabase)
  // This runs when session/guestMode changes but doesn't affect component tree
  useEffect(() => {
    if (!isAppReady) return;
    if (session && !isGuestMode) {
      console.log('📡 Setting up preference sync listener');
      const unsubscribe = setupPreferenceSyncListener();
      return () => {
        console.log('📡 Cleaning up preference sync listener');
        unsubscribe();
      };
    }
  }, [session, isGuestMode, isAppReady]);

  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync();
    }
  }, [isAppReady]);

  // ALWAYS render the same component tree - NO conditional returns
  // Use overlay for loading state instead of replacing the tree
  return (
    <CaptureProvider>
      {/* Loading overlay - shown on top when app isn't ready */}
      {!isAppReady && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 999999 }]}>
          <LoadingScreen message="Initializing..." />
        </View>
      )}
      
      {/* Main content - ONLY rendered when ready to ensure fonts/auth are stable */}
      {isAppReady && <MainAppContent />}
    </CaptureProvider>
  );
}

function FloatingTabBar() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { tabBarWidth } = useResponsive();
  const bottomOffset = Math.max(insets.bottom, 20);
  const pathname = usePathname();
  const router = useRouter();

  // Calculate active tab index
  const activeTabIndex = useMemo(() => {
    const index = TAB_ROUTES.findIndex(route =>
      pathname === `/${route.name}` ||
      pathname === route.path ||
      pathname.startsWith(`/${route.name}/`) ||
      pathname.startsWith(`${route.path}/`)
    );
    return index >= 0 ? index : 0;
  }, [pathname]);

  const activeTab = TAB_ROUTES[activeTabIndex]?.name || 'brief';

  // Animation for the sliding indicator
  const sliderPosition = useSharedValue(0);
  const TAB_COUNT = TAB_ROUTES.length;
  const SLIDER_SIZE = 48;
  const PADDING = 8;
  
  // Calculate tab width based on container
  const tabWidth = useMemo(() => {
    return (tabBarWidth - (PADDING * 2)) / TAB_COUNT;
  }, [tabBarWidth]);

  // Update slider position when active tab changes
  useEffect(() => {
    const targetPosition = PADDING + (activeTabIndex * tabWidth) + (tabWidth / 2) - (SLIDER_SIZE / 2);
    sliderPosition.value = withSpring(targetPosition, {
      damping: 20,
      stiffness: 300,
      mass: 0.5,
    });
  }, [activeTabIndex, tabWidth]);

  const sliderAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderPosition.value }],
  }));

  const handleTabPress = useCallback((route: typeof TAB_ROUTES[0]) => {
    router.push(route.path as any);
  }, [router]);

  return (
    <View
      style={[styles.tabBarWrapper, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <LiquidGlassView
        style={[
          styles.tabBarContainer,
          {
            width: tabBarWidth,
            ...(!isLiquidGlassSupported && {
              backgroundColor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)',
              borderWidth: 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 15,
            }),
          }
        ]}
        interactive
        effect="clear"
        colorScheme={isDark ? 'dark' : 'light'}
        tintColor={isDark ? undefined : '#F2F2F7'}
      >
        {/* Animated Slider Indicator */}
        <Animated.View
          style={[
            styles.slider,
            {
              backgroundColor: colors.primaryLight,
              width: SLIDER_SIZE,
              height: SLIDER_SIZE,
            },
            sliderAnimatedStyle,
          ]}
        />
        
        {/* Tab Items */}
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
            <View style={styles.iconWrapper}>
              <route.Icon
                size={26}
                color={activeTab === route.name ? colors.primary : colors.textTertiary}
                strokeWidth={2}
              />
            </View>
          </Pressable>
        ))}
      </LiquidGlassView>
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
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  slider: {
    position: 'absolute',
    borderRadius: 24,
    left: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: 48,
    minWidth: 48,
    zIndex: 1,
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