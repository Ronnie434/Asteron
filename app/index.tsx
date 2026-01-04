import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/store/useAuthStore';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function Index() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const { session, isGuestMode, isInitialized } = useAuthStore();
  const router = useRouter();
  const hasNavigated = useRef(false);
  
  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding').then(value => {
      setHasSeenOnboarding(value === 'true');
    });
  }, []);
  
  // Use effect-based navigation to avoid conditional returns
  useEffect(() => {
    if (hasSeenOnboarding === null || !isInitialized || hasNavigated.current) {
      return;
    }
    
    hasNavigated.current = true;
    
    if (!hasSeenOnboarding) {
      router.replace('/onboarding');
    } else if (!session && !isGuestMode) {
      router.replace('/signin');
    } else {
      router.replace('/(tabs)/brief');
    }
  }, [hasSeenOnboarding, isInitialized, session, isGuestMode, router]);
  
  // Always render the same component - just a loading screen
  // Navigation happens via useEffect to avoid conditional returns
  return (
    <View style={styles.container}>
      <LoadingScreen message="Loading..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
