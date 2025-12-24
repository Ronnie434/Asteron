import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic } from 'lucide-react-native';
import { theme } from '../src/ui/theme';
import { Typography } from '../src/ui/components/Typography';
import { Card } from '../src/ui/components/Card';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, IOSOutputFormat, AudioQuality } from 'expo-audio';
import { aiService } from '../src/ai/aiService';
import { useTheme } from '../src/contexts/ThemeContext';

const WAV_PRESET = {
  extension: '.wav',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 128000,
  android: {
    extension: '.wav',
    outputFormat: 'mpeg4' as const,
    audioEncoder: 'aac' as const,
  },
  ios: {
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.MAX,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/wav',
    bitsPerSecond: 128000,
  },
};

const WaveformBar = ({ delay, index, color }: { delay: number; index: number; color: string }) => {
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
          backgroundColor: color,
        },
      ]}
    />
  );
};

export default function VoiceScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recorder = useAudioRecorder(WAV_PRESET, (status) => {
    console.log('Recorder Status Update:', status);
  });
  const recorderState = useAudioRecorderState(recorder);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('Tap mic to speak');
  const [needsClarification, setNeedsClarification] = useState(false);
  const [transcription, setTranscription] = useState('');

  useEffect(() => {
    if (recorderState.isRecording) {
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

      return () => {
          pulse.stop();
          // Reset when stopped
          pulseAnim.setValue(1);
      };
    }
  }, [recorderState.isRecording]);

  // Initial setup - don't start recording automatically anymore to avoid confusion
  useEffect(() => {
    // Only cleanup on unmount
    return () => {
        try {
            if (recorder.isRecording) {
                recorder.stop();
            }
        } catch (e) {
            // ignore
        }
    };
  }, []);

  async function handleStartRecording() {
    console.log('Starting recording func...');
    // Clear previous clarification state
    setNeedsClarification(false);
    setTranscription('');
    
    try {
      const permission = await requestRecordingPermissionsAsync();
      console.log('Permission status:', permission.status);
      
      if (permission.status === 'granted') {
        setStatusText('Starting...');
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        console.log('Audio mode set, preparing...');
        await recorder.prepareToRecordAsync(WAV_PRESET);
        console.log('Prepared, calling record()');
        recorder.record();
        console.log('record() called');
      } else {
        setStatusText('Permission denied');
        console.log('Permission denied');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      setStatusText('Failed to start');
    }
  }

  async function handleStopRecording() {
    if (!recorder.isRecording) return;

    setIsProcessing(true);
    setStatusText('Transcribing...');

    try {
      await recorder.stop();
      const uri = recorder.uri;
      
      if (uri) {
        // Step 1: Transcribe
        const text = await aiService.transcribeAudio(uri);
        setTranscription(text);
        
        setStatusText('Analyzing...');
        
        // Step 2: Analyze
        const result = await aiService.analyzeText(text);
        
        // Step 3: Check if clarification is needed
        if (result.needsClarification || result.confidence < 0.5) {
          // Stay on voice screen and show clarification banner
          setNeedsClarification(true);
          setIsProcessing(false);
          setStatusText('Tap mic to try again');
        } else {
          // Navigate to confirm only if we have valid data
          router.push({
              pathname: '/confirm',
              params: {
                  title: result.title,
                  type: result.type,
                  priority: result.priority,
                  details: result.details,
                  dueAt: result.dueAt,
              }
          });
        }
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      setIsProcessing(false);
      setStatusText('Error. Try again.');
    }
  }

  async function handleCancel() {
    try {
        if (recorder.isRecording) {
            await recorder.stop();
        }
    } catch (err) {
        console.warn('Error stopping recording on cancel:', err);
    } finally {
        router.back();
    }
  }

  // Update status based on recorder state change
  useEffect(() => {
    if (recorderState.isRecording) {
        setStatusText('Listening...');
    } else if (isProcessing) {
        // keep processing text
    } else {
        setStatusText('Tap mic to speak');
    }
  }, [recorderState.isRecording, isProcessing]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
          
          <View style={[
            styles.largeCircle, 
            { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(162, 194, 250, 0.15)' },
            !recorderState.isRecording && { backgroundColor: 'transparent' }
          ]}>
            {/* Pulsing Effect */}
            {recorderState.isRecording && (
              <Animated.View 
                style={[
                  styles.pulseCircle,
                  { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(162, 194, 250, 0.1)',
                    transform: [{ scale: pulseAnim }] 
                  }
                ]}
              />
            )}
            
            {/* White Ring + Blue Mic Button */}
            <View style={[styles.whiteRing, { backgroundColor: colors.card }]}>
              <TouchableOpacity 
                style={[styles.micButton, { backgroundColor: colors.primary }]} 
                onPress={() => {
                  console.log('Mic button pressed');
                  if (recorderState.isRecording) {
                    handleStopRecording();
                  } else {
                    handleStartRecording();
                  }
                }}
                disabled={isProcessing}
              >
                {recorderState.isRecording ? (
                  <View style={[styles.stopIcon, { backgroundColor: '#FFFFFF' }]} />
                ) : (
                  <Mic size={40} color="#FFFFFF" strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Text */}
          <View style={styles.textContainer}>
            <Typography variant="title2" style={{ textAlign: 'center', marginBottom: 8, color: colors.text }}>
              {statusText}
            </Typography>
            <Typography 
              variant="body" 
              color={colors.textSecondary} 
              style={{ textAlign: 'center', maxWidth: 300 }}
            >
              Speak clearly to capture your thought.
            </Typography>
          </View>

          {/* Clarification Banner */}
          {needsClarification && !recorderState.isRecording && (
            <Card style={[styles.clarificationBanner, { 
              backgroundColor: isDark ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)',
              borderLeftColor: '#FF9500',
            }]}>
              <Typography variant="footnote" style={{ color: '#FF9500', fontWeight: '600', marginBottom: 8 }}>
                ⚠️ COULDN'T UNDERSTAND
              </Typography>
              <Typography variant="body" color={colors.text} style={{ marginBottom: 12, lineHeight: 22 }}>
                I couldn't extract a clear action. Try saying:
              </Typography>
              <Typography variant="callout" color={colors.textSecondary} style={{ marginBottom: 4 }}>
                • "Remind me to call mom tomorrow"
              </Typography>
              <Typography variant="callout" color={colors.textSecondary} style={{ marginBottom: 4 }}>
                • "Remember to buy groceries"
              </Typography>
              <Typography variant="callout" color={colors.textSecondary} style={{ marginBottom: 12 }}>
                • "Keep a record of my meeting notes"
              </Typography>
              {transcription && (
                <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.separator }}>
                  <Typography variant="caption1" color={colors.textTertiary} style={{ marginBottom: 4 }}>
                    You said:
                  </Typography>
                  <Typography variant="callout" color={colors.textSecondary} style={{ fontStyle: 'italic' }}>
                    "{transcription}"
                  </Typography>
                </View>
              )}
            </Card>
          )}

          {/* Waveform Visualizer */}
          {recorderState.isRecording ? (
            <View style={styles.waveformContainer}>
                <WaveformBar delay={0} index={0} color={colors.primary} />
                <WaveformBar delay={100} index={1} color={colors.primary} />
                <WaveformBar delay={200} index={2} color={colors.primary} />
                <WaveformBar delay={100} index={3} color={colors.primary} />
                <WaveformBar delay={0} index={4} color={colors.primary} />
            </View>
          ) : (
            <View style={{ height: 40, marginBottom: 40 }} />
          )}

          {/* Cancel Button */}
          {recorderState.isRecording && (
            <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.6}
            >
                <Typography variant="body" style={{ color: colors.danger, fontSize: 17 }}>
                Cancel
                </Typography>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set via inline style
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
    zIndex: 10, // Ensure it's above the pulse circle
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 11,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  clarificationBanner: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderLeftWidth: 4,
    maxWidth: 400,
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
    // backgroundColor set via inline style for dynamic theme
    borderRadius: 2,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  stopIcon: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
