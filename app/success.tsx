import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Typography } from '../src/ui/components/Typography';
import { useTheme } from '../src/contexts/ThemeContext';

export default function SuccessScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(checkScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after delay
    const timer = setTimeout(() => {
      router.replace('/(tabs)/upcoming');
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.circleOuter,
            { 
              backgroundColor: colors.success + '15',
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.circleInner,
              { 
                backgroundColor: colors.success,
                transform: [{ scale: checkScale }],
              }
            ]}
          >
            <Check size={40} color="#FFFFFF" strokeWidth={3} />
          </Animated.View>
        </Animated.View>
        
        <Animated.View style={{ opacity: opacityAnim }}>
          <Typography variant="title1" style={[styles.title, { color: colors.text }]}>
            Saved!
          </Typography>
          <Typography variant="body" color={colors.textSecondary} style={styles.subtitle}>
            Your item has been added
          </Typography>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  circleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  circleInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
});
