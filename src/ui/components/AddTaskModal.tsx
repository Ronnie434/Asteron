import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Clock, ChevronRight, X, Check, Repeat } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from './Typography';
import { Card } from './Card';
import { Chip } from './Chip';
import { theme } from '../theme';
import { useItemsStore } from '../../store/useItemsStore';
import { CustomRepeatConfig } from '../../db/items';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AddTaskModal({ visible, onClose }: AddTaskModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { addItem } = useItemsStore();
  
  const [title, setTitle] = useState('');
  const [type, setType] = useState('task');
  const [priority, setPriority] = useState('med');
  const [details, setDetails] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [repeat, setRepeat] = useState('none');
  
  // Custom repeat config
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [intervalWeeks, setIntervalWeeks] = useState<number>(1);
  
  // Repeat Modal State
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  
  // Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateType, setActiveDateType] = useState<'due' | 'remind' | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const resetForm = () => {
    setTitle('');
    setType('task');
    setPriority('med');
    setDetails('');
    setDueAt('');
    setRemindAt('');
    setRepeat('none');
    setSelectedDays([]);
    setIntervalWeeks(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const openDatePicker = (pickerType: 'due' | 'remind') => {
    setActiveDateType(pickerType);
    const existingStr = pickerType === 'due' ? dueAt : remindAt;
    setTempDate(existingStr ? new Date(existingStr) : new Date());
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    
    const currentDate = selectedDate || tempDate;
    setTempDate(currentDate);

    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (activeDateType === 'due') setDueAt(currentDate.toISOString());
      else if (activeDateType === 'remind') setRemindAt(currentDate.toISOString());
    }
  };

  const confirmIOSDate = () => {
    if (activeDateType === 'due') setDueAt(tempDate.toISOString());
    else if (activeDateType === 'remind') setRemindAt(tempDate.toISOString());
    setShowDatePicker(false);
  };

  const clearDate = (dateType: 'due' | 'remind') => {
    if (dateType === 'due') setDueAt('');
    else setRemindAt('');
  };

  const formatDateTime = (isoString: string): string => {
    if (!isoString) return 'None';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'None';
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    try {
      let repeatConfigStr: string | null = null;
      if (repeat === 'custom' && selectedDays.length > 0) {
        const config: CustomRepeatConfig = {
          days: selectedDays,
          intervalWeeks: intervalWeeks,
        };
        repeatConfigStr = JSON.stringify(config);
      }
      
      await addItem(title.trim(), {
        type: type as any,
        priority: priority as any,
        details: details || null,
        dueAt: dueAt || null,
        remindAt: remindAt || null,
        repeat: repeat as any,
        repeatConfig: repeatConfigStr,
      });
      handleClose();
    } catch (e) {
      console.error('Failed to add item:', e);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity 
              onPress={handleClose}
              style={[styles.headerButton, { backgroundColor: colors.text + '10' }]}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
            <Typography variant="headline">Add Task</Typography>
            <TouchableOpacity 
              onPress={handleSave}
              style={[styles.headerButton, { backgroundColor: colors.primary + '20' }]}
            >
              <Check size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView 
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView 
              style={styles.scrollContent}
              contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Title */}
              <Card style={styles.titleCard}>
                <TextInput
                  style={[styles.titleInput, { color: colors.text }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="What needs to be done?"
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                />
              </Card>

              {/* Type */}
              <Typography variant="footnote" color={colors.textSecondary} style={styles.label}>
                TYPE
              </Typography>
              <View style={styles.chipRow}>
                {['task', 'bill', 'reminder', 'followup', 'note'].map(t => (
                  <Chip 
                    key={t} 
                    label={t.charAt(0).toUpperCase() + t.slice(1)} 
                    selected={type === t}
                    onPress={() => setType(t)}
                  />
                ))}
              </View>

              {/* Priority */}
              <Typography variant="footnote" color={colors.textSecondary} style={styles.label}>
                PRIORITY
              </Typography>
              <View style={styles.chipRow}>
                <Chip label="High" selected={priority === 'high'} onPress={() => setPriority('high')} />
                <Chip label="Medium" selected={priority === 'med'} onPress={() => setPriority('med')} />
                <Chip label="Low" selected={priority === 'low'} onPress={() => setPriority('low')} />
              </View>

              {/* Details */}
              <Typography variant="footnote" color={colors.textSecondary} style={styles.label}>
                DETAILS
              </Typography>
              <Card style={styles.titleCard}>
                <TextInput
                  style={[styles.detailsInput, { color: colors.text }]}
                  value={details}
                  onChangeText={setDetails}
                  placeholder="Additional notes..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  textAlignVertical="top"
                />
              </Card>

              {/* Schedule */}
              <Typography variant="footnote" color={colors.textSecondary} style={styles.label}>
                SCHEDULE
              </Typography>
              <Card style={styles.scheduleCard}>
                {/* Due Date */}
                <View style={styles.scheduleRow}>
                  <Calendar size={20} color={colors.primary} strokeWidth={2} />
                  <TouchableOpacity style={{ flex: 1, marginLeft: 12 }} onPress={() => openDatePicker('due')}>
                    <Typography variant="body">Due Date</Typography>
                  </TouchableOpacity>
                  {dueAt ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity onPress={() => openDatePicker('due')}>
                        <Typography variant="body" color={colors.text}>{formatDateTime(dueAt)}</Typography>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => clearDate('due')}>
                        <X size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => openDatePicker('due')}>
                      <Typography variant="body" color={colors.textSecondary}>None</Typography>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={[styles.separator, { backgroundColor: colors.separator }]} />

                {/* Reminder */}
                <View style={styles.scheduleRow}>
                  <Clock size={20} color={colors.primary} strokeWidth={2} />
                  <TouchableOpacity style={{ flex: 1, marginLeft: 12 }} onPress={() => openDatePicker('remind')}>
                    <Typography variant="body">Reminder</Typography>
                  </TouchableOpacity>
                  {remindAt ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity onPress={() => openDatePicker('remind')}>
                        <Typography variant="body" color={colors.text}>{formatDateTime(remindAt)}</Typography>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => clearDate('remind')}>
                        <X size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => openDatePicker('remind')}>
                      <Typography variant="body" color={colors.textSecondary}>None</Typography>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={[styles.separator, { backgroundColor: colors.separator }]} />

                {/* Repeat */}
                <TouchableOpacity style={styles.scheduleRow} onPress={() => setShowRepeatModal(true)} activeOpacity={0.7}>
                  <Repeat size={20} color={colors.primary} strokeWidth={2} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Typography variant="body">Repeat</Typography>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Typography variant="body" color={colors.textSecondary}>
                      {repeat === 'none' ? 'None' : 
                       repeat === 'custom' && selectedDays.length > 0 
                         ? `${selectedDays.sort((a, b) => a - b).map(d => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d]).join(', ')} / ${intervalWeeks}w`
                         : repeat.charAt(0).toUpperCase() + repeat.slice(1)}
                    </Typography>
                    <ChevronRight size={18} color={colors.textTertiary} style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>
              </Card>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </GestureHandlerRootView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.pickerOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowDatePicker(false)} />
          <View style={[styles.pickerContent, { backgroundColor: colors.card }]}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Typography variant="body" color={colors.textSecondary}>Cancel</Typography>
              </TouchableOpacity>
              <Typography variant="headline">{activeDateType === 'due' ? 'Set Due Date' : 'Set Reminder'}</Typography>
              <TouchableOpacity onPress={confirmIOSDate}>
                <Typography variant="headline" color={colors.primary}>Done</Typography>
              </TouchableOpacity>
            </View>
            {Platform.OS === 'ios' ? (
              <DateTimePicker value={tempDate} mode="datetime" display="spinner" onChange={onDateChange} textColor={colors.text} style={{ height: 200 }} />
            ) : (
              <DateTimePicker value={tempDate} mode="datetime" display="default" onChange={onDateChange} />
            )}
          </View>
        </View>
      </Modal>

      {/* Repeat Modal */}
      <Modal visible={showRepeatModal} transparent animationType="slide" onRequestClose={() => setShowRepeatModal(false)}>
        <View style={styles.pickerOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowRepeatModal(false)} />
          <View style={[styles.repeatContent, { backgroundColor: colors.card }]}>
            <View style={styles.repeatHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Repeat size={22} color={colors.text} strokeWidth={2} />
                <Typography variant="headline">Repeat</Typography>
              </View>
              <TouchableOpacity onPress={() => setShowRepeatModal(false)} style={[styles.doneButton, { backgroundColor: colors.text + '20' }]}>
                <Typography variant="body" style={{ fontWeight: '600' }}>Done</Typography>
              </TouchableOpacity>
            </View>
            <View style={{ marginBottom: 20 }}>
              {[
                { value: 'none', label: 'None' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'custom', label: 'Custom' },
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setRepeat(option.value)}
                  style={[styles.repeatOption, { backgroundColor: repeat === option.value ? colors.primary + '15' : 'transparent', borderColor: repeat === option.value ? colors.primary : colors.text + '15' }]}
                >
                  <Typography variant="body" color={repeat === option.value ? colors.primary : colors.text} style={{ fontWeight: repeat === option.value ? '600' : '400' }}>
                    {option.label}
                  </Typography>
                  {repeat === option.value && <Check size={20} color={colors.primary} strokeWidth={2.5} />}
                </TouchableOpacity>
              ))}
            </View>
            {repeat === 'custom' && (
              <>
                <Typography variant="caption1" color={colors.textSecondary} style={{ marginBottom: 12 }}>SELECT DAYS</Typography>
                <View style={styles.dayRow}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                    const isSelected = selectedDays.includes(index);
                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => isSelected ? setSelectedDays(selectedDays.filter(d => d !== index)) : setSelectedDays([...selectedDays, index])}
                        style={[styles.dayButton, { backgroundColor: isSelected ? colors.primary : colors.text + '15' }]}
                      >
                        <Typography variant="headline" color={isSelected ? '#FFFFFF' : colors.textSecondary} style={{ fontSize: 16, fontWeight: '600' }}>{day.charAt(0)}</Typography>
                        <Typography variant="caption2" color={isSelected ? '#FFFFFF' : colors.textSecondary}>{day}</Typography>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Typography variant="caption1" color={colors.textSecondary} style={{ marginTop: 20, marginBottom: 12 }}>REPEAT EVERY</Typography>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[1, 2, 3, 4].map(weeks => (
                    <TouchableOpacity
                      key={weeks}
                      onPress={() => setIntervalWeeks(weeks)}
                      style={[styles.intervalChip, { backgroundColor: intervalWeeks === weeks ? colors.primary + '20' : colors.text + '10', borderColor: intervalWeeks === weeks ? colors.primary : 'transparent' }]}
                    >
                      <Typography variant="body" color={intervalWeeks === weeks ? colors.primary : colors.text} style={{ fontWeight: intervalWeeks === weeks ? '600' : '400' }}>{weeks}w</Typography>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  titleInput: {
    ...theme.typography.title3,
    fontSize: 18,
  },
  detailsInput: {
    ...theme.typography.body,
    fontSize: 16,
    height: 60,
  },
  label: {
    marginBottom: theme.spacing.sm,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.lg,
  },
  scheduleCard: {
    padding: 0,
    marginBottom: theme.spacing.lg,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  repeatContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  repeatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  repeatOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 44,
    height: 60,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
});
