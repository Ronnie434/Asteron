import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity, Platform, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../src/ui/theme';
import { Typography } from '../src/ui/components/Typography';
import { Card } from '../src/ui/components/Card';
import { Button } from '../src/ui/components/Button';
import { Chip } from '../src/ui/components/Chip';
import { Calendar, Clock, ChevronRight, X, Check } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { GlassyHeader } from '../src/ui/components/GlassyHeader';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useItemsStore } from '../src/store/useItemsStore';
import { useTheme } from '../src/contexts/ThemeContext';

export default function ConfirmScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const addItem = useItemsStore(state => state.addItem);
  const params = useLocalSearchParams<{ 
    title?: string; 
    type?: string; 
    priority?: string;
    details?: string;
    dueAt?: string;
    remindAt?: string;
  }>();
  
  const [title, setTitle] = useState(params.title || '');
  const [type, setType] = useState(params.type || 'task');
  const [priority, setPriority] = useState(params.priority || 'med');
  const [details, setDetails] = useState(params.details || '');
  const [dueAt, setDueAt] = useState(params.dueAt || '');
  const [remindAt, setRemindAt] = useState(params.remindAt || '');

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
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    
    const currentDate = selectedDate || tempDate;
    setTempDate(currentDate);

    // Android immediate set
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
    if (!title.trim()) return;
    try {
        await addItem(title, {
            type: type as any,
            priority: priority as any,
            details: details || null,
            dueAt: dueAt || null,
            remindAt: remindAt || null,
        });
        router.replace('/success');
    } catch (e) {
        console.error('Failed to save item:', e);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlassyHeader
        title="Edit"
        disableTopSafeArea
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
          { paddingTop: 100 } // Fixed padding for header height (72) + spacing
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
          <TouchableOpacity style={styles.scheduleRow}>
            <Calendar size={20} color={colors.primary} strokeWidth={2} />
            <Typography variant="body" style={{ marginLeft: 12, flex: 1 }}>
              Due Date
            </Typography>
            <Typography variant="body" color={dueAt ? colors.text : colors.textSecondary}>
              {formatDateTime(dueAt)}
            </Typography>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={[styles.separator, { backgroundColor: colors.separator }]} />
          <TouchableOpacity style={styles.scheduleRow}>
            <Clock size={20} color={colors.primary} strokeWidth={2} />
            <Typography variant="body" style={{ marginLeft: 12, flex: 1 }}>
              Reminder
            </Typography>
            <Typography variant="body" color={remindAt ? colors.text : colors.textSecondary}>
              {formatDateTime(remindAt)}
            </Typography>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {/* Date Picker Modal - separate modal on top of confirm modal */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: theme.colors.background, // Set via inline style
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    // borderBottomColor: theme.colors.separator, // Set via inline style
    // backgroundColor: theme.colors.card, // Set via inline style
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
    fontFamily: 'DMSans_500Medium',
    fontSize: 20,
    fontWeight: '500',
    // color: theme.colors.text, // Set via inline style
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
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    // backgroundColor: theme.colors.separator, // Set via inline style
    marginLeft: 48,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
});
