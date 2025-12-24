import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../src/ui/theme';
import { Typography } from '../src/ui/components/Typography';
import { Card } from '../src/ui/components/Card';
import { Button } from '../src/ui/components/Button';
import { Chip } from '../src/ui/components/Chip';
import { Calendar, Clock, ChevronRight } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { useItemsStore } from '../src/store/useItemsStore';
import { useTheme } from '../src/contexts/ThemeContext';

export default function ConfirmScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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
            details,
            dueAt: params.dueAt,
        });
        router.push('/(tabs)/brief');
    } catch (e) {
        console.error('Failed to save item:', e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Typography variant="body" color={colors.primary}>Cancel</Typography>
        </TouchableOpacity>
        <Typography variant="headline">Edit</Typography>
        <TouchableOpacity onPress={handleSave}>
          <Typography variant="headline" color={colors.primary}>Save</Typography>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
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
          {['task', 'bill', 'reminder', 'followup'].map(t => (
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
    </SafeAreaView>
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
});
