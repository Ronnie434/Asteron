import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic } from 'lucide-react-native';
import { theme } from '../src/ui/theme';
import { Typography } from '../src/ui/components/Typography';
import { useEffect, useRef } from 'react';

const WaveformBar = ({ delay, index }: { delay: number; index: number }) => {
  const heightAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(heightAnim, {
          toValue: 1,
          duration: 400 + index * 100,
          delay,
          useNativeDriver: false,
        }),
        Animated.timing(heightAnim, {
          toValue: 0.3,
          duration: 400 + index * 100,
          useNativeDriver: false,
        }),
      ])
    );
    
    animation.start();
    
    return () => animation.stop();
  }, []);

  const height = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 32],
  });

  return (
    <Animated.View
      style={[
        styles.waveBar,
        {
          height,
        },
      ]}
    />
  );
};

export default function VoiceScreen() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulse.start();
    
    return () => pulse.stop();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
          
          {/* Large Circular Background */}
          <View style={styles.largeCircle}>
            {/* Pulsing Effect */}
            <Animated.View 
              style={[
                styles.pulseCircle,
                { transform: [{ scale: pulseAnim }] }
              ]}
            />
            
            {/* White Ring + Blue Mic Button */}
            <View style={styles.whiteRing}>
              <View style={styles.micButton}>
                <Mic size={40} color="#FFFFFF" strokeWidth={2} />
              </View>
            </View>
          </View>

          {/* Text */}
          <View style={styles.textContainer}>
            <Typography variant="title2" style={{ textAlign: 'center', marginBottom: 8 }}>
              Listening...
            </Typography>
            <Typography 
              variant="body" 
              color={theme.colors.textSecondary} 
              style={{ textAlign: 'center', maxWidth: 300 }}
            >
              Speak clearly to capture your thought.
            </Typography>
          </View>

          {/* Waveform Visualizer */}
          <View style={styles.waveformContainer}>
            <WaveformBar delay={0} index={0} />
            <WaveformBar delay={100} index={1} />
            <WaveformBar delay={200} index={2} />
            <WaveformBar delay={100} index={3} />
            <WaveformBar delay={0} index={4} />
          </View>

          {/* Cancel Button */}
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => router.back()}
            activeOpacity={0.6}
          >
            <Typography variant="body" style={{ color: '#FF3B30', fontSize: 17 }}>
              Cancel
            </Typography>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  largeCircle: {
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(162, 194, 250, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  pulseCircle: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(162, 194, 250, 0.1)',
  },
  whiteRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    marginBottom: 40,
  },
  waveBar: {
    width: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
