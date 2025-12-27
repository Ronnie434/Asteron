import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  Pressable, 
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ArrowRight, 
  Sparkles, 
  Mic, 
  PenLine,
  Calendar,
  Bell,
  Moon,
  ListChecks,
  Zap,
  Sun,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { darkColors } from '../src/ui/theme';

const { width, height } = Dimensions.get('window');
const colors = darkColors; // Consistent dark theme throughout

interface OnboardingScreenProps {
  onComplete?: () => void;
}

// Slide data - focused on 5 core features
const SLIDES = [
  {
    id: 'welcome',
    icon: Sparkles,
    iconGradient: ['#6366F1', '#8B5CF6'] as const,
    title: 'Your Calm,\nReliable Companion',
    description: 'A minimal AI assistant that helps you stay on top of what matters — without the noise.',
    features: null,
  },
  {
    id: 'capture',
    icon: Mic,
    iconGradient: ['#8B5CF6', '#A855F7'] as const,
    title: 'Capture Everything',
    description: 'Thoughts, tasks, bills, follow-ups — just speak or type. We\'ll handle the rest.',
    features: [
      { icon: Mic, text: 'Voice capture', color: '#A855F7' },
      { icon: PenLine, text: 'Quick typing', color: '#6366F1' },
    ],
  },
  {
    id: 'organize',
    icon: ListChecks,
    iconGradient: ['#10B981', '#34D399'] as const,
    title: 'Auto-Organized',
    description: 'Everything gets sorted into Today and Upcoming — no manual work needed.',
    features: [
      { icon: Sun, text: 'Today\'s priorities', color: '#FBBF24' },
      { icon: Calendar, text: 'Upcoming items', color: '#6366F1' },
    ],
  },
  {
    id: 'brief',
    icon: Sun,
    iconGradient: ['#F59E0B', '#FBBF24'] as const,
    title: 'Daily Brief',
    description: 'Every morning, see what matters today and what can wait. Start clear-headed.',
    features: [
      { icon: Zap, text: 'Morning overview', color: '#FBBF24' },
      { icon: ListChecks, text: 'Prioritized tasks', color: '#34D399' },
    ],
  },
  {
    id: 'reminders',
    icon: Bell,
    iconGradient: ['#EC4899', '#F472B6'] as const,
    title: 'Smart Reminders',
    description: 'Get notified at the right time. Snooze or reschedule with a tap.',
    features: [
      { icon: Bell, text: 'Timely alerts', color: '#F472B6' },
      { icon: Moon, text: 'Quiet hours', color: '#818CF8' },
    ],
  },
];

// Animated Icon Component
function AnimatedIcon({ Icon, gradient }: { Icon: typeof Sparkles; gradient: readonly [string, string] }) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <View style={styles.iconContainer}>
      {/* Glow effect */}
      <Animated.View style={[styles.iconGlow, glowStyle]}>
        <LinearGradient
          colors={[gradient[0], 'transparent']}
          style={styles.iconGlowGradient}
        />
      </Animated.View>
      
      {/* Main icon */}
      <Animated.View style={animatedStyle}>
        <LinearGradient
          colors={gradient}
          style={styles.iconCircle}
        >
          <Icon size={40} color="#FFFFFF" strokeWidth={1.5} />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// Feature pill component
function FeaturePill({ icon: Icon, text, color }: { icon: typeof Sparkles; text: string; color: string }) {
  return (
    <View style={[styles.featurePill, { backgroundColor: `${color}15` }]}>
      <Icon size={16} color={color} strokeWidth={2} />
      <Text style={[styles.featurePillText, { color }]}>{text}</Text>
    </View>
  );
}

// Single slide component
function Slide({ item, index }: { item: typeof SLIDES[0]; index: number }) {
  return (
    <View style={styles.slide}>
      {/* Icon */}
      <Animated.View entering={FadeIn.delay(200).duration(600)}>
        <AnimatedIcon Icon={item.icon} gradient={item.iconGradient} />
      </Animated.View>

      {/* Title */}
      <Animated.Text 
        entering={FadeInDown.delay(400).duration(600)}
        style={styles.title}
      >
        {item.title}
      </Animated.Text>

      {/* Description */}
      <Animated.Text 
        entering={FadeInDown.delay(500).duration(600)}
        style={styles.description}
      >
        {item.description}
      </Animated.Text>

      {/* Features */}
      {item.features && (
        <Animated.View 
          entering={FadeInDown.delay(600).duration(600)}
          style={styles.featuresContainer}
        >
          {item.features.map((feature, i) => (
            <FeaturePill 
              key={i} 
              icon={feature.icon} 
              text={feature.text} 
              color={feature.color} 
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
}

// Main component
export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== currentIndex && roundIndex >= 0 && roundIndex < SLIDES.length) {
      setCurrentIndex(roundIndex);
    }
  };

  const finishOnboarding = async () => {
    if (onComplete) {
      onComplete();
    } else {
      try {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      } catch (e) {
        console.error('Failed to save onboarding status', e);
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

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0A0A0F', '#0F0F18', '#0A0A0F']}
        style={StyleSheet.absoluteFill}
      />

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

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <View 
              key={index}
              style={[
                styles.dot, 
                { 
                  backgroundColor: index === currentIndex ? '#818CF8' : 'rgba(255,255,255,0.2)',
                  width: index === currentIndex ? 24 : 8,
                }
              ]} 
            />
          ))}
        </View>

        {/* Skip button */}
        {!isLastSlide && (
          <Pressable 
            onPress={finishOnboarding} 
            style={styles.skipButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}

        {/* Main CTA Button */}
        <Pressable 
          onPress={nextSlide}
          style={({ pressed }) => [
            styles.ctaButton,
            { opacity: pressed ? 0.9 : 1 }
          ]}
        >
          <LinearGradient
            colors={['#6366F1', '#818CF8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>
              {isLastSlide ? 'Get Started' : 'Continue'}
            </Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 200, // Space for footer
  },

  // Icon styles
  iconContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  iconGlowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text styles
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 32,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: 16,
  },
  description: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 17,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 16,
    marginBottom: 32,
  },

  // Features
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  featurePillText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  skipButton: {
    position: 'absolute',
    top: 0,
    right: 24,
  },
  skipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  ctaButton: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  ctaText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    color: '#FFFFFF',
  },
});
