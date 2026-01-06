import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../src/ui/theme';
import { Typography } from '../src/ui/components/Typography';
import { Card } from '../src/ui/components/Card';
import { Chip } from '../src/ui/components/Chip';
import { Calendar, Clock, ChevronRight, Trash2, X, Check, Repeat } from 'lucide-react-native';
import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { GlassyHeader } from '../src/ui/components/GlassyHeader';

import { useItemsStore } from '../src/store/useItemsStore';
import { useTheme } from '../src/contexts/ThemeContext';
import { CustomRepeatConfig } from '../src/db/items';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function EditScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { updateItem, deleteItem, skipOccurrence, loadItems } = useItemsStore();
  const params = useLocalSearchParams<{ 
    id: string;
    title?: string; 
    type?: string; 
    priority?: string;
    details?: string;
    dueAt?: string;
    remindAt?: string;
    repeat?: string;
    repeatConfig?: string;
  }>();
  
  const itemId = params.id;
  const [title, setTitle] = useState(params.title || '');
  const [type, setType] = useState(params.type || 'task');
  const [priority, setPriority] = useState(params.priority || 'med');
  const [details, setDetails] = useState(params.details || '');
  const [dueAt, setDueAt] = useState(params.dueAt || '');
  const [remindAt, setRemindAt] = useState(params.remindAt || '');
  const [repeat, setRepeat] = useState(params.repeat || 'none');
  
  // Custom repeat config
  const [selectedDays, setSelectedDays] = useState<number[]>(() => {
    if (params.repeatConfig) {
      try {
        const config = JSON.parse(params.repeatConfig);
        return config.days || [];
      } catch { return []; }
    }
    return [];
  });
  const [intervalWeeks, setIntervalWeeks] = useState<number>(() => {
    if (params.repeatConfig) {
      try {
        const config = JSON.parse(params.repeatConfig);
        return config.intervalWeeks || 1;
      } catch { return 1; }
    }
    return 1;
  });
  
  // Repeat Modal State
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  
  // Loading state for save/delete operations
  const [isSaving, setIsSaving] = useState(false);
  
  // Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateType, setActiveDateType] = useState<'due' | 'remind' | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const openDatePicker = (type: 'due' | 'remind') => {
    setActiveDateType(type);
    const existingStr = type === 'due' ? dueAt : remindAt;
    setTempDate(existingStr ? new Date(existingStr) : new Date());
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    // On Android, dismissing gives 'dismissed' event. On iOS, change gives date.
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

  const clearDate = (type: 'due' | 'remind') => {
    if (type === 'due') setDueAt('');
    else setRemindAt('');
  };

  // Format ISO date to readable string
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
    if (!title.trim() || !itemId) return;
    setIsSaving(true);
    try {
        // Build repeatConfig if custom
        let repeatConfigStr: string | null = null;
        if (repeat === 'custom' && selectedDays.length > 0) {
          const config: CustomRepeatConfig = {
            days: selectedDays,
            intervalWeeks: intervalWeeks,
          };
          repeatConfigStr = JSON.stringify(config);
        }
        
        await updateItem(itemId, {
            title,
            type: type as any,
            priority: priority as any,
            details: details || null,
            dueAt: dueAt || null,
            remindAt: remindAt || null,
            repeat: repeat as any,
            repeatConfig: repeatConfigStr,
        });
        router.back();
    } catch (e) {
        console.error('Failed to update item:', e);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = () => {
    // Check if this is a repeating task
    if (repeat && repeat !== 'none') {
      // For repeating tasks, show options
      Alert.alert(
        'Delete Repeating Task',
        `"${title}" repeats ${repeat}. What would you like to delete?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'This Day Only',
            onPress: async () => {
              if (itemId) {
                setIsSaving(true);
                try {
                  // Skip today's occurrence (or the displayed date)
                  const occurrenceDate = remindAt ? new Date(remindAt) : new Date();
                  await skipOccurrence(itemId, occurrenceDate);
                  await loadItems();
                  router.back();
                } finally {
                  setIsSaving(false);
                }
              }
            },
          },
          {
            text: 'All Occurrences',
            style: 'destructive',
            onPress: async () => {
              if (itemId) {
                setIsSaving(true);
                try {
                  await deleteItem(itemId);
                  router.back();
                } finally {
                  setIsSaving(false);
                }
              }
            },
          },
        ]
      );
    } else {
      // Non-repeating: simple confirmation
      Alert.alert(
        'Delete Item',
        'Are you sure you want to delete this item?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              if (itemId) {
                setIsSaving(true);
                try {
                  await deleteItem(itemId);
                  router.back();
                } finally {
                  setIsSaving(false);
                }
              }
            }
          },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlassyHeader
        title="Edit"
        disableTopSafeArea
        isFloatingPill
        isModalSheet
        leftAction={
          <TouchableOpacity 
            onPress={() => router.back()}
            style={[styles.iconButton, { backgroundColor: colors.text + '10' }]}
          >
            <X size={22} color={colors.text} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity 
            onPress={handleSave}
            style={[styles.iconButton, { backgroundColor: colors.primary + '20' }]}
          >
            <Check size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView 
        contentContainerStyle={[
          styles.content, 
          { paddingTop: 8 + 56 + 16 } // header offset (8) + header height (56) + spacing (16)
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Card style={styles.titleCard}>
          <TextInput
            style={[styles.titleInput, { color: colors.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
            placeholderTextColor={colors.textTertiary}
          />
        </Card>

        {/* Type */}
        <Typography 
          variant="footnote" 
          color={colors.textSecondary}
          style={styles.label}
        >
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
        <Typography 
          variant="footnote" 
          color={colors.textSecondary}
          style={styles.label}
        >
          PRIORITY
        </Typography>
        <View style={styles.chipRow}>
          <Chip label="High" selected={priority === 'high'} onPress={() => setPriority('high')} />
          <Chip label="Medium" selected={priority === 'med'} onPress={() => setPriority('med')} />
          <Chip label="Low" selected={priority === 'low'} onPress={() => setPriority('low')} />
        </View>

        {/* Details */}
        <Typography 
          variant="footnote" 
          color={colors.textSecondary}
          style={styles.label}
        >
          DETAILS
        </Typography>
        <Card style={styles.titleCard}>
          <TextInput
            style={[styles.titleInput, { fontSize: 16, height: 80, color: colors.text }]}
            value={details}
            onChangeText={setDetails}
            placeholder="Additional notes..."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
          />
        </Card>

        {/* Date & Reminder */}
        <Typography 
          variant="footnote" 
          color={colors.textSecondary}
          style={styles.label}
        >
          SCHEDULE
        </Typography>
        <Card style={styles.scheduleCard}>
          <View style={styles.scheduleRow}>
            <Calendar size={20} color={colors.primary} strokeWidth={2} />
            <TouchableOpacity 
              style={{ flex: 1, marginLeft: 12 }} 
              onPress={() => openDatePicker('due')}
            >
              <Typography variant="body">Due Date</Typography>
            </TouchableOpacity>
            
            {dueAt ? (
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                 <TouchableOpacity onPress={() => openDatePicker('due')}>
                    <Typography variant="body" color={colors.text}>
                       {formatDateTime(dueAt)}
                    </Typography>
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

          <View style={styles.scheduleRow}>
            <Clock size={20} color={colors.primary} strokeWidth={2} />
            <TouchableOpacity 
              style={{ flex: 1, marginLeft: 12 }} 
              onPress={() => openDatePicker('remind')}
            >
              <Typography variant="body">Reminder</Typography>
            </TouchableOpacity>
            
            {remindAt ? (
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                 <TouchableOpacity onPress={() => openDatePicker('remind')}>
                    <Typography variant="body" color={colors.text}>
                       {formatDateTime(remindAt)}
                    </Typography>
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

          <TouchableOpacity 
            style={styles.scheduleRow}
            onPress={() => setShowRepeatModal(true)}
            activeOpacity={0.7}
          >
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

        {/* Delete Button */}
        <TouchableOpacity 
          style={[styles.deleteButton, { backgroundColor: colors.danger + '15' }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Trash2 size={20} color={colors.danger} strokeWidth={2} />
          <Typography variant="body" color={colors.danger} style={{ marginLeft: 8 }}>
            Delete Item
          </Typography>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal - separate modal on top of edit modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable 
          style={styles.datePickerModalOverlay} 
          onPress={() => setShowDatePicker(false)}
        >
          <Pressable 
            style={[styles.datePickerModalContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.datePickerModalHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Typography variant="body" color={colors.textSecondary}>Cancel</Typography>
              </TouchableOpacity>
              <Typography variant="headline">
                {activeDateType === 'due' ? 'Set Due Date' : 'Set Reminder'}
              </Typography>
              <TouchableOpacity onPress={confirmIOSDate}>
                <Typography variant="headline" color={colors.primary}>Done</Typography>
              </TouchableOpacity>
            </View>
            
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={tempDate}
                mode="datetime"
                display="spinner"
                onChange={onDateChange}
                textColor={colors.text}
                style={{ height: 200 }}
              />
            ) : (
              <DateTimePicker
                value={tempDate}
                mode="datetime"
                display="default"
                onChange={onDateChange}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Repeat Modal */}
      <Modal
        visible={showRepeatModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRepeatModal(false)}
      >
        <Pressable 
          style={styles.datePickerModalOverlay} 
          onPress={() => setShowRepeatModal(false)}
        >
          <Pressable 
            style={[styles.repeatModalContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.repeatModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Repeat size={22} color={colors.text} strokeWidth={2} />
                <Typography variant="headline">Repeat</Typography>
              </View>
              <TouchableOpacity 
                onPress={() => setShowRepeatModal(false)}
                style={[styles.doneButton, { backgroundColor: colors.text + '20' }]}
              >
                <Typography variant="body" style={{ fontWeight: '600' }}>Done</Typography>
              </TouchableOpacity>
            </View>

            {/* Repeat Options List */}
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
                  style={[
                    styles.repeatOption,
                    { 
                      backgroundColor: repeat === option.value ? colors.primary + '15' : 'transparent',
                      borderColor: repeat === option.value ? colors.primary : colors.text + '15',
                    }
                  ]}
                >
                  <Typography 
                    variant="body" 
                    color={repeat === option.value ? colors.primary : colors.text}
                    style={{ fontWeight: repeat === option.value ? '600' : '400' }}
                  >
                    {option.label}
                  </Typography>
                  {repeat === option.value && (
                    <Check size={20} color={colors.primary} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Day Selection - only show when custom is selected */}
            {repeat === 'custom' && (
              <>
                <Typography variant="caption1" color={colors.textSecondary} style={{ marginBottom: 12 }}>
                  SELECT DAYS
                </Typography>
                <View style={styles.dayRow}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                    const isSelected = selectedDays.includes(index);
                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedDays(selectedDays.filter(d => d !== index));
                          } else {
                            setSelectedDays([...selectedDays, index]);
                          }
                        }}
                        style={[
                          styles.dayButton,
                          { 
                            backgroundColor: isSelected ? colors.primary : colors.text + '15',
                          }
                        ]}
                      >
                        <Typography 
                          variant="headline" 
                          color={isSelected ? '#FFFFFF' : colors.textSecondary}
                          style={{ fontSize: 16, fontWeight: '600' }}
                        >
                          {day.charAt(0)}
                        </Typography>
                        <Typography 
                          variant="caption2" 
                          color={isSelected ? '#FFFFFF' : colors.textSecondary}
                        >
                          {day}
                        </Typography>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Interval Section */}
                <Typography variant="caption1" color={colors.textSecondary} style={{ marginTop: 20, marginBottom: 12 }}>
                  REPEAT EVERY
                </Typography>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[1, 2, 3, 4].map(weeks => (
                    <TouchableOpacity
                      key={weeks}
                      onPress={() => setIntervalWeeks(weeks)}
                      style={[
                        styles.intervalChip,
                        { 
                          backgroundColor: intervalWeeks === weeks ? colors.primary + '20' : colors.text + '10',
                          borderColor: intervalWeeks === weeks ? colors.primary : 'transparent',
                        }
                      ]}
                    >
                      <Typography 
                        variant="body" 
                        color={intervalWeeks === weeks ? colors.primary : colors.text}
                        style={{ fontWeight: intervalWeeks === weeks ? '600' : '400' }}
                      >
                        {weeks}w
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Loading Overlay */}
      {isSaving && <LoadingScreen overlay message="Saving..." />}
    </View>
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  titleCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  titleInput: {
    ...theme.typography.title3, // Manrope
    fontSize: 20,
  },
  label: {
    marginBottom: theme.spacing.sm,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.xl,
  },
  scheduleCard: {
    padding: 0,
    marginBottom: theme.spacing.xl,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  // Date Picker Modal Styles
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  // Repeat Modal Styles
  repeatModalContent: {
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 40,
  },
  repeatModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  summaryPill: {
    borderWidth: 1.5,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
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
  intervalRow: {
    borderWidth: 1.5,
    borderRadius: 24,
    overflow: 'hidden',
  },
  intervalOption: {
    paddingVertical: 14,
    alignItems: 'center',
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
  intervalChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
});
