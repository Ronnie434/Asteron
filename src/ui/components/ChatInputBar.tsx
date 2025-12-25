import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Mic, ArrowUp, Square } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { theme } from '../theme';

interface ChatInputBarProps {
  onSend: (text: string) => void;
  onVoicePress: () => void;
  onPlusPress?: () => void;
  isRecording?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
}

/**
 * Floating chat input bar with plus, text input, mic, and send buttons.
 * Inspired by ChatGPT's input interface.
 */
export function ChatInputBar({
  onSend,
  onVoicePress,
  onPlusPress,
  isRecording = false,
  isProcessing = false,
  placeholder = "What's on your mind?",
}: ChatInputBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const hasText = text.trim().length > 0;
  const maxInputHeight = 120;

  const handleSend = () => {
    if (!hasText || isProcessing) return;
    
    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();

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
          paddingBottom: Math.max(insets.bottom, 16),
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
          },
        ]}
      >
        {/* Plus Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onPlusPress}
          activeOpacity={0.7}
        >
          <Plus size={24} color={colors.textSecondary} />
        </TouchableOpacity>

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
          editable={!isRecording && !isProcessing}
        />

        {/* Mic Button */}
        {!hasText && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onVoicePress}
            activeOpacity={0.7}
          >
            {isRecording ? (
              <Square size={20} color={colors.danger} fill={colors.danger} />
            ) : (
              <Mic size={22} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        )}

        {/* Send Button */}
        {hasText && (
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: isProcessing ? colors.textTertiary : colors.primary,
                },
              ]}
              onPress={handleSend}
              activeOpacity={0.8}
              disabled={isProcessing}
            >
              <ArrowUp size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    fontFamily: 'DMSans_400Regular',
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
});
