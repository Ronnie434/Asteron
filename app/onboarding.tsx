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
  Image,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Sparkles,
  Mic,
  PenLine,
  Calendar,
  Bell,
  Moon,
  Sun,
  Check,
  ChevronUp,
  ChevronDown,
  Shield,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { theme, lightColors, darkColors } from '../src/ui/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { RainbowText } from '../src/ui/components/RainbowText';
import { useResponsive } from '../src/ui/useResponsive';

interface OnboardingScreenProps {
  onComplete?: () => void;
}

// ============================================================
// ANIMATION HOOK - Triggers on slide change
// ============================================================
function useSlideAnimation(isActive: boolean) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  useEffect(() => {
    if (isActive) {
      // Reset then animate in
      opacity.value = 0;
      translateY.value = 30;
      
      opacity.value = withDelay(100, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));
      translateY.value = withDelay(100, withTiming(0, { duration: 500, easing: Easing.out(Easing.back(1.2)) }));
    }
  }, [isActive]);

  return { opacity, translateY };
}

function useStaggeredAnimation(isActive: boolean, delay: number) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(25);

  useEffect(() => {
    if (isActive) {
      opacity.value = 0;
      translateY.value = 25;
      
      opacity.value = withDelay(delay, withTiming(1, { duration: 350 }));
      translateY.value = withDelay(delay, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }));
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
}

// ============================================================
// SCREEN 1: HERO - Sharp Positioning
// ============================================================
function HeroScreen({ isActive, colors, isDark, readyKey }: { isActive: boolean; colors: typeof lightColors | typeof darkColors; isDark: boolean; readyKey: string }) {
  const logoScale = useSharedValue(1);
  const logoOpacity = useSharedValue(0);
  
  useEffect(() => {
    if (isActive) {
      logoOpacity.value = 0;
      logoScale.value = 0.8;
      
      logoOpacity.value = withDelay(50, withTiming(1, { duration: 400 }));
      logoScale.value = withDelay(50, withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) }));
    }
  }, [isActive]);

  const animatedLogo = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const brandStyle = useStaggeredAnimation(isActive, 200);
  const headlineStyle = useStaggeredAnimation(isActive, 350);
  const subheadStyle = useStaggeredAnimation(isActive, 500);
  const trustStyle = useStaggeredAnimation(isActive, 650);

  return (
    <View style={styles.slide}>
      {/* App Logo */}
      <Animated.View style={[styles.logoContainer, animatedLogo]}>
        <Image 
          source={require('../assets/AI_Companion_icon.png')} 
          style={styles.appLogo}
        />
      </Animated.View>

      {/* Brand Name + AI Badge */}
      <Animated.View style={[styles.brandContainer, brandStyle]}>
        <Text style={[styles.brandName, { color: colors.text }]}>Asteron</Text>
        <View style={[styles.aiBadge, { backgroundColor: isDark ? 'rgba(129, 140, 248, 0.15)' : 'rgba(99, 102, 241, 0.12)' }]}>
          <Sparkles size={12} color={colors.primary} />
          <Text style={[styles.aiBadgeText, { color: colors.primary }]}>AI-Powered</Text>
        </View>
      </Animated.View>

      {/* Sharp Headline */}
      <Animated.View style={headlineStyle}>
        <RainbowText 
          key={readyKey}
          text={`Stop getting blindsided\nby deadlines.`}
          textStyle={[styles.heroHeadline, { color: colors.text }]}
          containerStyle={{ marginBottom: 16 }}
        />
        
      </Animated.View>

      {/* Subhead */}
      <Animated.Text style={[styles.heroSubhead, subheadStyle, { color: colors.textSecondary }]}>
        Bills, renewals, follow-ups—Asteron turns quick notes into organized reminders and a calm daily brief.
      </Animated.Text>

      {/* Trust Line */}
      <Animated.View style={[styles.trustContainer, trustStyle, { backgroundColor: isDark ? 'rgba(129, 140, 248, 0.1)' : 'rgba(99, 102, 241, 0.08)' }]}>
        <Shield size={14} color={colors.primary} />
        <Text style={[styles.trustText, { color: colors.textSecondary }]}>Private by default. No ads. You control notifications.</Text>
      </Animated.View>
    </View>
  );
}

// ============================================================
// SCREEN 2: CAPTURE - Better Language + Example Card
// ============================================================
function CaptureScreen({ isActive, colors, isDark, readyKey }: { isActive: boolean; colors: typeof lightColors | typeof darkColors; isDark: boolean; readyKey: string }) {
  const iconStyle = useStaggeredAnimation(isActive, 50);
  const titleStyle = useStaggeredAnimation(isActive, 200);
  const descStyle = useStaggeredAnimation(isActive, 350);
  const cardStyle = useStaggeredAnimation(isActive, 500);
  const pillsStyle = useStaggeredAnimation(isActive, 650);

  return (
    <View style={styles.slide}>
      {/* Icon */}
      <Animated.View style={iconStyle}>
        <LinearGradient colors={['#8B5CF6', '#A855F7']} style={styles.iconCircle}>
          <Mic size={36} color="#FFFFFF" strokeWidth={1.5} />
        </LinearGradient>
      </Animated.View>

      {/* Title */}
      <Animated.View style={titleStyle}>
        <RainbowText 
          key={readyKey}
          text={`Drop it here.\nGet it out of your head.`}
          textStyle={[styles.screenTitle, { color: colors.text }]}
          containerStyle={{ marginBottom: 12 }}
        />
      </Animated.View>

      {/* Description */}
      <Animated.Text style={[styles.screenDescription, descStyle, { color: colors.textSecondary }]}>
        Speak or type—Asteron organizes it. No sorting, no folders, no friction.
      </Animated.Text>

      {/* Example Card */}
      <Animated.View style={[styles.exampleCard, cardStyle, { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
      }]}>
        <View style={styles.exampleCardHeader}>
          <Mic size={16} color="#A855F7" />
          <Text style={[styles.exampleCardLabel, { color: colors.textSecondary }]}>You say:</Text>
        </View>
        <Text style={[styles.exampleCardInput, { color: colors.text }]}>"Pay PG&E bill January 5th"</Text>
        <View style={[styles.exampleCardDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
        <View style={styles.exampleCardResult}>
          <Calendar size={14} color={colors.success} />
          <Text style={[styles.exampleCardResultText, { color: colors.success }]}>Added to Upcoming • Jan 5</Text>
        </View>
      </Animated.View>

      {/* Feature Pills */}
      <Animated.View style={[styles.pillsRow, pillsStyle]}>
        <View style={[styles.pill, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
          <Mic size={14} color="#A855F7" />
          <Text style={[styles.pillText, { color: '#A855F7' }]}>Voice</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.12)' }]}>
          <PenLine size={14} color={colors.primary} />
          <Text style={[styles.pillText, { color: colors.primary }]}>Typing</Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ============================================================
// SCREEN 3: ORGANIZE - Mini Today/Upcoming List
// ============================================================
function OrganizeScreen({ isActive, colors, isDark, readyKey }: { isActive: boolean; colors: typeof lightColors | typeof darkColors; isDark: boolean; readyKey: string }) {
  const titleStyle = useStaggeredAnimation(isActive, 50);
  const descStyle = useStaggeredAnimation(isActive, 200);
  const listStyle = useStaggeredAnimation(isActive, 400);

  return (
    <View style={styles.slide}>
      {/* Title */}
      <Animated.View style={titleStyle}>
        <RainbowText 
          key={readyKey}
          text={`Today vs Upcoming.\nAuto-sorted.`}
          textStyle={[styles.screenTitle, { color: colors.text }]}
          containerStyle={{ marginBottom: 12 }}
        />
      </Animated.View>

      {/* Description */}
      <Animated.Text style={[styles.screenDescription, descStyle, { color: colors.textSecondary }]}>
        Everything lands in the right place. Focus on today, glance at what's next.
      </Animated.Text>

      {/* Mini List UI */}
      <Animated.View style={[styles.miniListContainer, listStyle, {
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
      }]}>
        {/* Today Section */}
        <View style={styles.miniSection}>
          <View style={styles.miniSectionHeader}>
            <Sun size={14} color={colors.warning} />
            <Text style={[styles.miniSectionTitle, { color: colors.textSecondary }]}>TODAY</Text>
          </View>
          <View style={styles.miniTask}>
            <View style={[styles.miniCheckbox, { borderColor: colors.warning }]} />
            <Text style={[styles.miniTaskText, { color: colors.text }]}>Call dentist</Text>
            <Text style={[styles.miniTaskTime, { color: colors.textTertiary }]}>10:00 AM</Text>
          </View>
          <View style={styles.miniTask}>
            <View style={[styles.miniCheckbox, { borderColor: colors.warning }]} />
            <Text style={[styles.miniTaskText, { color: colors.text }]}>Review quarterly goals</Text>
            <Text style={[styles.miniTaskTime, { color: colors.textTertiary }]}>2:00 PM</Text>
          </View>
        </View>

        {/* Upcoming Section */}
        <View style={styles.miniSection}>
          <View style={styles.miniSectionHeader}>
            <Calendar size={14} color={colors.primary} />
            <Text style={[styles.miniSectionTitle, { color: colors.textSecondary }]}>UPCOMING</Text>
          </View>
          <View style={styles.miniTask}>
            <View style={[styles.miniCheckbox, { borderColor: colors.primary }]} />
            <Text style={[styles.miniTaskText, { color: colors.text }]}>Pay PG&E bill</Text>
            <Text style={[styles.miniTaskTime, { color: colors.textTertiary }]}>Jan 5</Text>
          </View>
          <View style={styles.miniTask}>
            <View style={[styles.miniCheckbox, { borderColor: colors.primary }]} />
            <Text style={[styles.miniTaskText, { color: colors.text }]}>Renew car registration</Text>
            <Text style={[styles.miniTaskTime, { color: colors.textTertiary }]}>Jan 12</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ============================================================
// SCREEN 4: DAILY BRIEF - Interactive Time Picker
// ============================================================
function DailyBriefScreen({ 
  isActive,
  colors,
  isDark,
  briefTime, 
  onTimeChange,
  readyKey,
}: { 
  isActive: boolean;
  colors: typeof lightColors | typeof darkColors;
  isDark: boolean;
  briefTime: string; 
  onTimeChange: (hour: number) => void;
  readyKey: string;
}) {
  const hour = parseInt(briefTime.split(':')[0], 10);
  
  const incrementHour = () => {
    const newHour = hour >= 11 ? 5 : hour + 1;
    onTimeChange(newHour);
  };
  
  const decrementHour = () => {
    const newHour = hour <= 5 ? 11 : hour - 1;
    onTimeChange(newHour);
  };

  const formatTime = (h: number) => `${h}:00 AM`;

  const iconStyle = useStaggeredAnimation(isActive, 50);
  const titleStyle = useStaggeredAnimation(isActive, 200);
  const descStyle = useStaggeredAnimation(isActive, 350);
  const pickerStyle = useStaggeredAnimation(isActive, 500);
  const previewStyle = useStaggeredAnimation(isActive, 650);

  return (
    <View style={styles.slide}>
      {/* Icon */}
      <Animated.View style={iconStyle}>
        <LinearGradient colors={['#F59E0B', '#FBBF24']} style={styles.iconCircle}>
          <Sun size={36} color="#FFFFFF" strokeWidth={1.5} />
        </LinearGradient>
      </Animated.View>

      {/* Title */}
      <Animated.View style={titleStyle}>
        <RainbowText 
          key={readyKey}
          text={`Your morning brief.\nClear priorities.`}
          textStyle={[styles.screenTitle, { color: colors.text }]}
          containerStyle={{ marginBottom: 12 }}
        />
      </Animated.View>

      {/* Description */}
      <Animated.Text style={[styles.screenDescription, descStyle, { color: colors.textSecondary }]}>
        Every morning, see what matters today and what can wait. Start calm.
      </Animated.Text>

      {/* Time Picker */}
      <Animated.View style={[styles.timePickerCard, pickerStyle, {
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
      }]}>
        <Text style={[styles.timePickerLabel, { color: colors.textSecondary }]}>When do you want your daily brief?</Text>
        <View style={styles.timePickerRow}>
          <Pressable onPress={decrementHour} style={[styles.timeButton, { backgroundColor: isDark ? 'rgba(129, 140, 248, 0.15)' : 'rgba(99, 102, 241, 0.12)' }]} hitSlop={10}>
            <ChevronDown size={24} color={colors.primary} />
          </Pressable>
          <View style={[styles.timeDisplay, { backgroundColor: isDark ? 'rgba(129, 140, 248, 0.2)' : 'rgba(99, 102, 241, 0.15)' }]}>
            <Text style={[styles.timeText, { color: colors.text }]}>{formatTime(hour)}</Text>
          </View>
          <Pressable onPress={incrementHour} style={[styles.timeButton, { backgroundColor: isDark ? 'rgba(129, 140, 248, 0.15)' : 'rgba(99, 102, 241, 0.12)' }]} hitSlop={10}>
            <ChevronUp size={24} color={colors.primary} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Mini Brief Preview */}
      <Animated.View style={[styles.briefPreview, previewStyle, {
        backgroundColor: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(245, 158, 11, 0.08)',
        borderColor: isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(245, 158, 11, 0.15)'
      }]}>
        <View style={styles.briefPreviewHeader}>
          <Sparkles size={14} color={colors.warning} />
          <Text style={[styles.briefPreviewTitle, { color: colors.warning }]}>Daily Brief Preview</Text>
        </View>
        <View style={styles.briefPreviewStats}>
          <View style={styles.briefStat}>
            <Text style={[styles.briefStatNumber, { color: colors.text }]}>3</Text>
            <Text style={[styles.briefStatLabel, { color: colors.textSecondary }]}>Today</Text>
          </View>
          <View style={[styles.briefStatDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
          <View style={styles.briefStat}>
            <Text style={[styles.briefStatNumber, { color: colors.text }]}>5</Text>
            <Text style={[styles.briefStatLabel, { color: colors.textSecondary }]}>Upcoming</Text>
          </View>
          <View style={[styles.briefStatDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
          <View style={styles.briefStat}>
            <Check size={16} color={colors.success} />
            <Text style={[styles.briefStatLabel, { color: colors.textSecondary }]}>On track</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ============================================================
// SCREEN 5: QUIET HOURS - Setup + Promise
// ============================================================
function QuietHoursScreen({
  isActive,
  colors,
  isDark,
  quietStart,
  quietEnd,
  onStartChange,
  onEndChange,
  readyKey,
}: {
  isActive: boolean;
  colors: typeof lightColors | typeof darkColors;
  isDark: boolean;
  quietStart: string;
  quietEnd: string;
  onStartChange: (hour: number) => void;
  onEndChange: (hour: number) => void;
  readyKey: string;
}) {
  const startHour = parseInt(quietStart.split(':')[0], 10);
  const endHour = parseInt(quietEnd.split(':')[0], 10);

  const formatPM = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
  const formatAM = (h: number) => `${h}:00 AM`;

  const iconStyle = useStaggeredAnimation(isActive, 50);
  const titleStyle = useStaggeredAnimation(isActive, 200);
  const descStyle = useStaggeredAnimation(isActive, 350);
  const cardStyle = useStaggeredAnimation(isActive, 500);
  const promiseStyle = useStaggeredAnimation(isActive, 700);

  return (
    <View style={styles.slide}>
      {/* Icon */}
      <Animated.View style={iconStyle}>
        <LinearGradient colors={['#6366F1', '#818CF8']} style={styles.iconCircle}>
          <Moon size={36} color="#FFFFFF" strokeWidth={1.5} />
        </LinearGradient>
      </Animated.View>

      {/* Title */}
      <Animated.View style={titleStyle}>
        <RainbowText 
          key={readyKey}
          text={`Fewer pings.\nMore control.`}
          textStyle={[styles.screenTitle, { color: colors.text }]}
          containerStyle={{ marginBottom: 12 }}
        />
      </Animated.View>

      {/* Description */}
      <Animated.Text style={[styles.screenDescription, descStyle, { color: colors.textSecondary }]}>
        Set quiet hours so you only hear from us when it matters.
      </Animated.Text>

      {/* Quiet Hours Setup */}
      <Animated.View style={[styles.quietHoursCard, cardStyle, {
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
      }]}>
        <Text style={[styles.quietHoursLabel, { color: colors.textSecondary }]}>Quiet hours</Text>
        
        <View style={styles.quietHoursRow}>
          <View style={styles.quietTimeBlock}>
            <Text style={[styles.quietTimeLabel, { color: colors.textTertiary }]}>From</Text>
            <View style={styles.quietTimeControl}>
              <Pressable onPress={() => onStartChange(startHour > 20 ? 20 : startHour + 1)} hitSlop={10}>
                <ChevronUp size={20} color={colors.primary} />
              </Pressable>
              <Text style={[styles.quietTimeValue, { color: colors.text }]}>{formatPM(startHour)}</Text>
              <Pressable onPress={() => onStartChange(startHour < 20 ? 23 : startHour - 1)} hitSlop={10}>
                <ChevronDown size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>
          
          <Text style={[styles.quietTimeTo, { color: colors.textTertiary }]}>to</Text>
          
          <View style={styles.quietTimeBlock}>
            <Text style={[styles.quietTimeLabel, { color: colors.textTertiary }]}>Until</Text>
            <View style={styles.quietTimeControl}>
              <Pressable onPress={() => onEndChange(endHour >= 10 ? 5 : endHour + 1)} hitSlop={10}>
                <ChevronUp size={20} color={colors.primary} />
              </Pressable>
              <Text style={[styles.quietTimeValue, { color: colors.text }]}>{formatAM(endHour)}</Text>
              <Pressable onPress={() => onEndChange(endHour <= 5 ? 10 : endHour - 1)} hitSlop={10}>
                <ChevronDown size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Promise */}
      <Animated.View style={[styles.promiseContainer, promiseStyle, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(16, 185, 129, 0.08)' }]}>
        <Bell size={16} color={colors.success} />
        <Text style={[styles.promiseText, { color: colors.success }]}>No notifications during quiet hours. Ever.</Text>
      </Animated.View>
    </View>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { width } = useWindowDimensions(); // Dynamic width for FlatList
  const { isDesktop, maxWidths } = useResponsive();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();
  
  // Settings
  const {
    setQuietHoursStart,
    setQuietHoursEnd,
  } = useSettingsStore();
  
  const [briefHour, setBriefHour] = useState(8);
  const [quietStartHour, setQuietStartHour] = useState(22);
  const [quietEndHour, setQuietEndHour] = useState(7);
  
  // Layout stability check for first launch
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  
  useEffect(() => {
    // Small delay to ensure SafeAreaProvider and Dimensions are stable
    const timer = setTimeout(() => {
      setIsLayoutReady(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);



  const slides = ['hero', 'capture', 'organize', 'brief', 'quiet'];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== currentIndex && roundIndex >= 0 && roundIndex < slides.length) {
      setCurrentIndex(roundIndex);
    }
  };

  const finishOnboarding = async () => {
    // Save settings
    setQuietHoursStart(`${quietStartHour}:00`);
    setQuietHoursEnd(`${quietEndHour}:00`);
    
    // Save onboarding completion to AsyncStorage
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch (e) {
      console.error('Failed to save onboarding status', e);
    }
    
    // If callback provided (legacy usage), call it
    if (onComplete) {
      onComplete();
    } else {
      // Navigate to signin screen (expo-router will handle the rest via guards)
      router.replace('/signin');
    }
  };

  const nextSlide = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      finishOnboarding();
    }
  };

  const renderSlide = ({ item, index }: { item: string; index: number }) => {
    const isActive = index === currentIndex;
    
    const readyKey = isLayoutReady ? 'ready' : 'loading';

    const slideContent = (() => {
      switch (item) {
        case 'hero':
          return <HeroScreen isActive={isActive} colors={colors} isDark={isDark} readyKey={readyKey} />;
        case 'capture':
          return <CaptureScreen isActive={isActive} colors={colors} isDark={isDark} readyKey={readyKey} />;
        case 'organize':
          return <OrganizeScreen isActive={isActive} colors={colors} isDark={isDark} readyKey={readyKey} />;
        case 'brief':
          return (
            <DailyBriefScreen
              isActive={isActive}
              colors={colors}
              isDark={isDark}
              briefTime={`${briefHour}:00`}
              onTimeChange={setBriefHour}
              readyKey={readyKey}
            />
          );
        case 'quiet':
          return (
            <QuietHoursScreen
              isActive={isActive}
              colors={colors}
              isDark={isDark}
              quietStart={`${quietStartHour}:00`}
              quietEnd={`${quietEndHour}:00`}
              onStartChange={setQuietStartHour}
              onEndChange={setQuietEndHour}
              readyKey={readyKey}
            />
          );
        default:
          return null;
      }
    })();

    return (
      <View style={[styles.slideContainer, { width }]}>
        <View style={[
          styles.slideContent,
          isDesktop && { maxWidth: maxWidths.onboardingSlide },
          { opacity: isLayoutReady ? 1 : 0 }
        ]}>
          {slideContent}
        </View>
      </View>
    );
  };

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#000000', '#000000', '#000000'] : [colors.background, colors.backgroundSecondary, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <FlatList
        ref={flatListRef}
        key={width} // Force re-render on orientation/dimension change
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        extraData={currentIndex}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {/* Pagination */}
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View 
              key={index}
              style={[
                styles.dot, 
                { 
                  backgroundColor: index === currentIndex ? colors.primary : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),
                  width: index === currentIndex ? 24 : 8,
                }
              ]} 
            />
          ))}
        </View>

        {/* Skip */}
        {!isLastSlide && (
          <Pressable onPress={finishOnboarding} style={styles.skipButton} hitSlop={10}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </Pressable>
        )}

        {/* CTA */}
        <Pressable onPress={nextSlide} style={({ pressed }) => [styles.ctaButton, { opacity: pressed ? 0.9 : 1 }]}>
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

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 180,
    width: '100%',
  },
  slide: {
    width: '100%',
    alignItems: 'center',
  },

  // Logo & Brand
  logoContainer: {
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    ...theme.typography.title1,
    color: '#FFFFFF',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appLogo: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    borderRadius: 12,
  },
  aiBadgeText: {
    ...theme.typography.caption2,
    color: '#818CF8',
    letterSpacing: 0.5,
  },

  // Hero Screen
  heroHeadline: {
    ...theme.typography.largeTitle,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 42,
  },
  heroSubhead: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
    marginBottom: 32,
  },
  trustContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    borderRadius: 20,
  },
  trustText: {
    ...theme.typography.footnote,
    color: 'rgba(255,255,255,0.6)',
  },

  // Generic Screens
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  screenTitle: {
    ...theme.typography.title1,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 36,
  },
  screenDescription: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 8,
  },

  // Example Card
  exampleCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  exampleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  exampleCardLabel: {
    ...theme.typography.footnote,
    color: 'rgba(255,255,255,0.5)',
  },
  exampleCardInput: {
    ...theme.typography.body,
    fontFamily: 'DMSans_500Medium', // Keep medium weight
    color: '#FFFFFF',
    marginBottom: 12,
  },
  exampleCardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  exampleCardResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exampleCardResultText: {
    ...theme.typography.body,
    fontSize: 14,
    color: '#34D399',
  },

  // Pills
  pillsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  pillText: {
    ...theme.typography.subhead,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },

  // Mini List
  miniListContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  miniSection: {
    marginBottom: 16,
  },
  miniSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  miniSectionTitle: {
    ...theme.typography.caption2,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
  miniTask: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  miniCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    marginRight: 12,
  },
  miniTaskText: {
    ...theme.typography.subhead,
    color: '#FFFFFF',
    flex: 1,
  },
  miniTaskTime: {
    ...theme.typography.caption1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },

  // Time Picker
  timePickerCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  timePickerLabel: {
    ...theme.typography.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  timeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplay: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(129, 140, 248, 0.2)',
    borderRadius: 12,
  },
  timeText: {
    ...theme.typography.title1,
    color: '#FFFFFF',
  },

  // Brief Preview
  briefPreview: {
    width: '100%',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  briefPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  briefPreviewTitle: {
    ...theme.typography.subhead,
    fontSize: 13,
    color: '#FBBF24',
  },
  briefPreviewStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  briefStat: {
    alignItems: 'center',
  },
  briefStatNumber: {
    ...theme.typography.title1,
    fontSize: 24,
    color: '#FFFFFF',
  },
  briefStatLabel: {
    ...theme.typography.caption1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  briefStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Quiet Hours
  quietHoursCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quietHoursLabel: {
    ...theme.typography.subhead,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
    textAlign: 'center',
  },
  quietHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  quietTimeBlock: {
    alignItems: 'center',
  },
  quietTimeLabel: {
    ...theme.typography.caption1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 8,
  },
  quietTimeControl: {
    alignItems: 'center',
    gap: 4,
  },
  quietTimeValue: {
    ...theme.typography.title2,
    color: '#FFFFFF',
    paddingVertical: 8,
  },
  quietTimeTo: {
    ...theme.typography.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  promiseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderRadius: 20,
  },
  promiseText: {
    ...theme.typography.footnote,
    fontSize: 13,
    color: '#34D399',
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
    ...theme.typography.callout,
    fontWeight: '500',
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
    ...theme.typography.title3,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
