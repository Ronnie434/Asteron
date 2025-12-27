
import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  Image, 
  Pressable, 
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { useTheme } from '../src/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowRight } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: 'welcome',
    title: 'Your AI Companion',
    description: 'Always here to help you organize your life, answer questions, and keep you on track.',
    image: require('../assets/images/onboarding_welcome.png'),
    color: '#6366F1'
  },
  {
    id: 'organize',
    title: 'Stay Organized',
    description: 'Effortlessly manage your tasks, events, and projects with intelligent sorting.',
    image: require('../assets/images/onboarding_organize.png'),
    color: '#3B82F6'
  },
  {
    id: 'capture',
    title: 'Instant Capture',
    description: 'Just speak to add notes, reminders, or tasks. Your voice is all you need.',
    image: require('../assets/images/onboarding_capture.png'),
    color: '#8B5CF6'
  },
  {
    id: 'reminders',
    title: 'Smart Reminders',
    description: 'Never miss a beat with intelligent reminders that adapt to your schedule.',
    image: require('../assets/images/onboarding_reminders.png'),
    color: '#EC4899'
  }
];

interface OnboardingScreenProps {
  onComplete?: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Animation values
  const floatY = useSharedValue(0);

  useEffect(() => {
    // Continuous floating animation
    floatY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: floatY.value }],
    };
  });

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== currentIndex) {
      setCurrentIndex(roundIndex);
    }
  };

  const finishOnboarding = async () => {
    // If onComplete callback is provided (when rendered outside navigation),
    // use that. Otherwise, use the old method with AsyncStorage + router.
    if (onComplete) {
      onComplete();
    } else {
      try {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
        router.replace('/(tabs)/brief');
      } catch (e) {
        console.error('Failed to save onboarding status', e);
        router.replace('/(tabs)/brief');
      }
    }
  };

  const nextSlide = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      finishOnboarding();
    }
  };

  const skipOnboarding = () => {
    finishOnboarding();
  };

  const Slide = ({ item, index }: { item: typeof SLIDES[0], index: number }) => {
    return (
      <View style={[styles.slide, { backgroundColor: colors.background }]}>
        <View style={styles.imageContainer}>
          <Animated.View style={[animatedImageStyle]}>
            <Image 
              source={item.image} 
              style={styles.image}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
        
        <View style={styles.contentContainer}>
          <Animated.Text 
            entering={FadeInDown.delay(300).duration(500)}
            key={`title-${index}`}
            style={[
              styles.title, 
              { color: colors.text }
            ]}
          >
            {item.title}
          </Animated.Text>
          
          <Animated.Text 
            entering={FadeInDown.delay(500).duration(500)}
            key={`desc-${index}`}
            style={[
              styles.description, 
              { color: colors.textSecondary }
            ]}
          >
            {item.description}
          </Animated.Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={({ item, index }) => <Slide item={item} index={index} />}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <View 
              key={index}
              style={[
                styles.dot, 
                { 
                  backgroundColor: index === currentIndex ? colors.primary : colors.textTertiary,
                  width: index === currentIndex ? 24 : 8,
                  opacity: index === currentIndex ? 1 : 0.3
                }
              ]} 
            />
          ))}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable 
            onPress={skipOnboarding}
            style={styles.skipButton}
          >
             <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </Pressable>

          <Pressable 
            onPress={nextSlide}
            style={[styles.nextButton, { backgroundColor: colors.primary }]}
          >
            {currentIndex === SLIDES.length - 1 ? (
               <View style={styles.btnContent}>
                 <Text style={styles.nextText}>Get Started</Text>
               </View>
            ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.nextText}>Next</Text>
                  <ArrowRight size={20} color="#FFF" style={{ marginLeft: 6 }} />
                </View>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width,
    height,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  imageContainer: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 40,
  },
  image: {
    width: width * 0.85,
    height: width * 0.85,
    maxHeight: 400,
  },
  contentContainer: {
    flex: 0.4,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 32,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  description: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '90%',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    zIndex: 100, // Ensure it's above potential overlays
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
  },
  nextButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
  }
});
