import { useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Keyboard, 
  TouchableOpacity,
  Platform,
  Animated,
  Modal,
  Pressable
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/ui/theme';
import { Card } from '../../src/ui/components/Card';
import { Button } from '../../src/ui/components/Button';
import { Typography } from '../../src/ui/components/Typography';
import { Chip } from '../../src/ui/components/Chip';
import { Sparkles, Calendar, Flag, Clock, X, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useItemsStore } from '../../src/store/useItemsStore';
import { aiService } from '../../src/ai/aiService';
import { useTheme } from '../../src/contexts/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function CaptureScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const addItem = useItemsStore(state => state.addItem);
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [keyboardHeight] = useState(new Animated.Value(0));
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // User selections
  const [selectedDueAt, setSelectedDueAt] = useState<Date | null>(null);
  const [selectedRemindAt, setSelectedRemindAt] = useState<Date | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'med' | 'high' | null>(null);

  // Modal states
  const [showDateModal, setShowDateModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        Animated.timing(keyboardHeight, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? 250 : 0,
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 250 : 0,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleSave = async () => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    Keyboard.dismiss();
    try {
      const result = await aiService.analyzeText(text);
      
      const title = result.title?.trim() || text.slice(0, 50).trim();
      
      // User selections override AI results
      const finalDueAt = selectedDueAt?.toISOString() || result.dueAt || null;
      const finalRemindAt = selectedRemindAt?.toISOString() || result.remindAt || null;
      const finalPriority = selectedPriority || result.priority || 'med';
      
      // Determine type: if user set date/reminder, treat as task/reminder, otherwise use AI
      let finalType = result.type || 'note';
      if (selectedDueAt || selectedRemindAt) {
        finalType = selectedRemindAt ? 'reminder' : 'task';
      }
      
      await addItem(title, {
        type: finalType,
        priority: finalPriority,
        confidence: result.confidence || 0.5,
        details: result.details || text,
        dueAt: finalDueAt,
        remindAt: finalRemindAt,
        status: 'active'
      });
      
      // Reset state
      setText('');
      setSelectedDueAt(null);
      setSelectedRemindAt(null);
      setSelectedPriority(null);
      
      // Navigate based on whether it has a date
      if (finalDueAt || finalRemindAt) {
        router.push('/(tabs)/upcoming');
      } else if (finalType === 'note') {
        router.push('/(tabs)/notes');
      } else {
        router.push('/(tabs)/brief');
      }
    } catch (e) {
      console.error('Failed to save:', e);
      await addItem(text.slice(0, 50), {
        type: 'note',
        priority: 'low',
        confidence: 1.0,
        details: text,
        status: 'active'
      });
      setText('');
      router.push('/(tabs)/notes');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetToday = () => {
    const today = new Date();
    today.setHours(17, 0, 0, 0); // Default to 5 PM
    setSelectedDueAt(today);
    setShowDateModal(false);
  };

  const handleSetTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);
    setSelectedDueAt(tomorrow);
    setShowDateModal(false);
  };

  const handleConfirmDate = () => {
    setSelectedDueAt(tempDate);
    setShowDateModal(false);
  };

  const handleConfirmReminder = () => {
    setSelectedRemindAt(tempDate);
    setShowReminderModal(false);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Animated.View 
          style={[
            styles.content,
            { 
              paddingBottom: isKeyboardVisible ? 0 : 120,
              marginBottom: keyboardHeight,
            }
          ]}
        >
          <Card style={styles.mainCard}>
            {/* AI Voice Mode Button */}
            <TouchableOpacity 
              style={styles.aiButton}
              onPress={() => router.push('/voice')}
              activeOpacity={0.6}
            >
              <Sparkles size={24} color={colors.primary} />
            </TouchableOpacity>

            {/* Main Input Area */}
            <View style={styles.inputWrapper}>
              <TextInput 
                placeholder="What's on your mind?" 
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { color: colors.text }]}
                multiline
                value={text}
                onChangeText={setText}
                textAlignVertical="top"
              />
            </View>

            {/* Bottom Actions Section */}
            <View style={styles.footer}>
              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity 
                  style={[
                    styles.actionChip, 
                    { backgroundColor: selectedDueAt ? colors.primaryLight : colors.background }
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setTempDate(selectedDueAt || new Date());
                    setShowDateModal(true);
                  }}
                >
                  <Calendar size={18} color={selectedDueAt ? colors.primary : colors.text} />
                  <Typography 
                    variant="footnote" 
                    style={{ marginLeft: 6 }}
                    color={selectedDueAt ? colors.primary : colors.text}
                  >
                    {formatDate(selectedDueAt) || 'Date'}
                  </Typography>
                  {selectedDueAt && (
                    <TouchableOpacity 
                      onPress={(e) => { e.stopPropagation(); setSelectedDueAt(null); }}
                      style={{ marginLeft: 4 }}
                    >
                      <X size={14} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.actionChip, 
                    { backgroundColor: selectedPriority ? colors.primaryLight : colors.background }
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowPriorityModal(true);
                  }}
                >
                  <Flag size={18} color={selectedPriority ? colors.primary : colors.text} />
                  <Typography 
                    variant="footnote" 
                    style={{ marginLeft: 6 }}
                    color={selectedPriority ? colors.primary : colors.text}
                  >
                    {selectedPriority ? selectedPriority.charAt(0).toUpperCase() + selectedPriority.slice(1) : 'Priority'}
                  </Typography>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.actionChip, 
                    { backgroundColor: selectedRemindAt ? colors.primaryLight : colors.background }
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setTempDate(selectedRemindAt || new Date());
                    setShowReminderModal(true);
                  }}
                >
                  <Clock size={18} color={selectedRemindAt ? colors.primary : colors.text} />
                  <Typography 
                    variant="footnote" 
                    style={{ marginLeft: 6 }}
                    color={selectedRemindAt ? colors.primary : colors.text}
                  >
                    {formatTime(selectedRemindAt) || 'Remind'}
                  </Typography>
                  {selectedRemindAt && (
                    <TouchableOpacity 
                      onPress={(e) => { e.stopPropagation(); setSelectedRemindAt(null); }}
                      style={{ marginLeft: 4 }}
                    >
                      <X size={14} color={colors.primary} />
                    </TouchableOpacity>
                  )}
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
        </Animated.View>
      </SafeAreaView>

      {/* Date Picker Modal */}
      <Modal visible={showDateModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowDateModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Typography variant="headline">Due Date</Typography>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.quickDateButtons}>
              <TouchableOpacity 
                style={[styles.quickDateBtn, { backgroundColor: colors.background }]}
                onPress={handleSetToday}
              >
                <Typography variant="body">Today</Typography>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickDateBtn, { backgroundColor: colors.background }]}
                onPress={handleSetTomorrow}
              >
                <Typography variant="body">Tomorrow</Typography>
              </TouchableOpacity>
            </View>
            
            <DateTimePicker
              value={tempDate}
              mode="datetime"
              display="spinner"
              onChange={(e, date) => date && setTempDate(date)}
              style={{ height: 150 }}
            />
            
            <Button label="Confirm" onPress={handleConfirmDate} variant="primary" />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Priority Modal */}
      <Modal visible={showPriorityModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowPriorityModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Typography variant="headline">Priority</Typography>
              <TouchableOpacity onPress={() => setShowPriorityModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.priorityOptions}>
              {(['high', 'med', 'low'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityOption,
                    { 
                      backgroundColor: selectedPriority === p ? colors.primaryLight : colors.background,
                      borderColor: selectedPriority === p ? colors.primary : colors.separator,
                    }
                  ]}
                  onPress={() => {
                    setSelectedPriority(p);
                    setShowPriorityModal(false);
                  }}
                >
                  <View style={[
                    styles.priorityDot,
                    { backgroundColor: p === 'high' ? '#FF3B30' : p === 'med' ? '#FF9500' : '#34C759' }
                  ]} />
                  <Typography variant="body" style={{ marginLeft: 12 }}>
                    {p === 'high' ? 'High' : p === 'med' ? 'Medium' : 'Low'}
                  </Typography>
                  {selectedPriority === p && (
                    <Check size={20} color={colors.primary} style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => {
                setSelectedPriority(null);
                setShowPriorityModal(false);
              }}
            >
              <Typography variant="body" color={colors.textSecondary}>Clear</Typography>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Reminder Modal */}
      <Modal visible={showReminderModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowReminderModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Typography variant="headline">Reminder</Typography>
              <TouchableOpacity onPress={() => setShowReminderModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <DateTimePicker
              value={tempDate}
              mode="datetime"
              display="spinner"
              onChange={(e, date) => date && setTempDate(date)}
              style={{ height: 150 }}
            />
            
            <Button label="Set Reminder" onPress={handleConfirmReminder} variant="primary" />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  mainCard: {
    flex: 1,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    lineHeight: 28,
    paddingVertical: theme.spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    marginTop: 48,
  },
  footer: {
    marginTop: theme.spacing.lg,
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    gap: 8,
    flexWrap: 'wrap',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  quickDateButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.lg,
  },
  quickDateBtn: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  priorityOptions: {
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  clearButton: {
    alignItems: 'center',
    padding: theme.spacing.md,
  },
});
