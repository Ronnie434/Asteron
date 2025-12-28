import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Animated,
  Keyboard,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Mic, ArrowUp, Square, X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { theme } from '../theme';
import { Waveform } from './Waveform';

interface ChatInputBarProps {
  onSend: (text: string) => void;
  onVoicePress: () => void;
  onPlusPress?: () => void;
  onCancelRecording?: () => void;
  onSendRecording?: () => void;
  isRecording?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
}

/**
 * Floating chat input bar with plus, text input, mic, and send buttons.
 * Supports voice recording mode.
 */
export function ChatInputBar({
  onSend,
  onVoicePress,
  onPlusPress,
  onCancelRecording,
  onSendRecording,
  isRecording = false,
  isProcessing = false,
  placeholder = "What's on your mind?",
}: ChatInputBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const hasText = text.trim().length > 0;
  const maxInputHeight = 120;

  // Track keyboard visibility
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      Keyboard.dismiss();
    }
  }, [isRecording]);

  const handleSend = () => {
    if (!hasText || isProcessing) return;
    
    // Animate button press
    onSend(text.trim());
    setText('');
    setInputHeight(40);
    Keyboard.dismiss();
  };

  const handleContentSizeChange = (event: any) => {
    const { height } = event.nativeEvent.contentSize;
    setInputHeight(Math.min(Math.max(40, height), maxInputHeight));
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom + 8, 24),
          backgroundColor: colors.background,
        },
      ]}
    >
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            paddingLeft: isRecording ? 6 : 8,
            paddingRight: isRecording ? 6 : 8,
          },
        ]}
      >
        {isRecording ? (
          // RECORDING UI
          <>
            {/* Stop/Cancel Button */}
            <TouchableOpacity
              style={[styles.iconButton, styles.cancelButton]}
              activeOpacity={0.7}
              onPress={onCancelRecording}
            >
              <View style={[styles.stopIconWrapper, { backgroundColor: isDark ? '#3A3A3C' : '#F2F2F7' }]}>
                <Square size={16} color={colors.danger} fill={colors.danger} />
              </View>
            </TouchableOpacity>

            {/* Waveform Visualization */}
            <View style={styles.waveformContainer}>
              <Waveform active={true} count={25} />
            </View>

            {/* Send Audio Button */}
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={onSendRecording}
            >
              <ArrowUp size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </>
        ) : (
          // DEFAULT TEXT INPUT UI
          <>
            {/* Plus Button - Commented out for future feature
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.7}
              onPress={onPlusPress}
            >
              <Plus size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            */}

            {/* Text Input */}
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  height: inputHeight,
                },
              ]}
              placeholder={placeholder}
              placeholderTextColor={colors.textTertiary}
              value={text}
              onChangeText={setText}
              multiline
              onContentSizeChange={handleContentSizeChange}
              editable={!isProcessing}
            />

            {/* Mic Button */}
            {!hasText && (
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.7}
                onPress={onVoicePress}
              >
                <Mic size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {/* Send Button */}
            {hasText && (
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: isProcessing ? colors.textTertiary : colors.primary }
                  ]}
                  activeOpacity={0.8}
                  onPress={handleSend}
                  disabled={isProcessing}
                >
                  <ArrowUp size={20} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </Animated.View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 100,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 26,
    borderWidth: 1,
    minHeight: 52,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    ...theme.typography.body,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    paddingHorizontal: 4,
    maxHeight: 120,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginBottom: 2,
  },
  cancelButton: {
    width: 36,
    height: 40,
    marginLeft: -4,
  },
  stopIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});
