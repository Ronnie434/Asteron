import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from './Typography';
import { useTheme } from '../../contexts/ThemeContext';
import { Check, AlertCircle } from 'lucide-react-native';
import type { ChatMessage as ChatMessageType } from '../../store/useChatStore';

interface ChatMessageProps {
  message: ChatMessageType;
}

/**
 * Chat message bubble component.
 * Displays user messages (right-aligned) and assistant messages (left-aligned).
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const { colors, isDark } = useTheme();
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser && styles.containerUser]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: isDark ? '#2C2C2E' : colors.primary }]
            : [styles.bubbleAssistant, { backgroundColor: isDark ? '#1C1C1E' : '#F0F0F5' }],
        ]}
      >
        <Typography
          variant="body"
          style={[
            styles.text,
            { color: isUser ? (isDark ? colors.text : '#FFFFFF') : colors.text },
          ]}
        >
          {message.content}
        </Typography>

        {/* Action Result Card */}
        {message.actionResult && (
          <View
            style={[
              styles.actionCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <View style={styles.actionHeader}>
              {message.actionResult.type === 'created' && (
                <View style={[styles.actionIcon, { backgroundColor: colors.success }]}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
              {message.actionResult.type === 'updated' && (
                <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
              {message.actionResult.type === 'deleted' && (
                <View style={[styles.actionIcon, { backgroundColor: colors.danger }]}>
                  <AlertCircle size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
              <Typography variant="caption1" color={colors.textSecondary}>
                {message.actionResult.type === 'created' && 'Created'}
                {message.actionResult.type === 'updated' && 'Updated'}
                {message.actionResult.type === 'deleted' && 'Deleted'}
                {' '}
                {message.actionResult.itemType}
              </Typography>
            </View>
            <Typography variant="callout" style={{ color: colors.text }}>
              {message.actionResult.itemTitle}
            </Typography>
          </View>
        )}
      </View>

      {/* Timestamp */}
      <Typography
        variant="caption2"
        color={colors.textTertiary}
        style={[styles.timestamp, isUser && styles.timestampUser]}
      >
        {formatTime(message.timestamp)}
      </Typography>
    </View>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 16,
    alignItems: 'flex-start',
  },
  containerUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 4,
  },
  text: {
    lineHeight: 22,
  },
  timestamp: {
    marginTop: 4,
    marginLeft: 8,
  },
  timestampUser: {
    marginLeft: 0,
    marginRight: 8,
  },
  actionCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
});
