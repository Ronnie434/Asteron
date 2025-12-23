import { useState } from 'react';
import { View, TextInput, StyleSheet, Keyboard, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../src/ui/theme';
import { Card } from '../../src/ui/components/Card';
import { Button } from '../../src/ui/components/Button';
import { Typography } from '../../src/ui/components/Typography';
import { Sparkles, Calendar, Flag, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useItemsStore } from '../../src/store/useItemsStore';
import { parseTextStub } from '../../src/ai/parseTextStub';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function CaptureScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const addItem = useItemsStore(state => state.addItem);
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    Keyboard.dismiss();
    try {
      const parsed = await parseTextStub(text);
      await addItem(parsed.title, {
        type: parsed.type,
        priority: parsed.priority,
        confidence: parsed.confidence,
      });
      setText('');
      router.push('/(tabs)/brief');
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
      pointerEvents="box-none"
    >
      <View style={styles.content}>
        <Card style={[styles.mainCard, { flex: 1 }]}>
          {/* AI Voice Mode Button */}
          <TouchableOpacity 
            style={styles.aiButton}
            onPress={() => router.push('/voice')}
            activeOpacity={0.6}
          >
            <Sparkles size={24} color={colors.primary} />
          </TouchableOpacity>

          {/* Main Input Area */}
          <TextInput 
            placeholder="What's on your mind?" 
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.text }]}
            multiline
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
          />

          {/* Bottom Actions Section */}
          <View style={styles.footer}>
            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity style={[styles.actionChip, { backgroundColor: colors.background }]}>
                <Calendar size={18} color={colors.text} />
                <Typography variant="footnote" style={{ marginLeft: 6 }}>Today</Typography>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionChip, { backgroundColor: colors.background }]}>
                <Flag size={18} color={colors.text} />
                <Typography variant="footnote" style={{ marginLeft: 6 }}>Priority</Typography>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionChip, { backgroundColor: colors.background }]}>
                <Clock size={18} color={colors.text} />
                <Typography variant="footnote" style={{ marginLeft: 6 }}>Remind</Typography>
              </TouchableOpacity>
            </View>

            <Button 
              label={isProcessing ? "Saving..." : "Save Note"}
              onPress={handleSave}
              loading={isProcessing}
              disabled={!text.trim()}
              variant="primary"
            />
          </View>
        </Card>
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
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: 120,
  },
  mainCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  input: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    lineHeight: 28,
    paddingVertical: theme.spacing.sm,
  },
  footer: {
    marginTop: theme.spacing.lg,
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    gap: 8,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
  },
  aiButton: {
    position: 'absolute',
    top: theme.spacing.lg,
    right: theme.spacing.lg,
    padding: 8,
    zIndex: 10,
  },
});
