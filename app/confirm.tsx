import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../src/ui/theme';
import { Typography } from '../src/ui/components/Typography';
import { Card } from '../src/ui/components/Card';
import { Button } from '../src/ui/components/Button';
import { Chip } from '../src/ui/components/Chip';
import { Calendar, Clock, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';

export default function ConfirmScreen() {
  const router = useRouter();
  
  const [title, setTitle] = useState('New Task');
  const [type, setType] = useState('task');
  const [priority, setPriority] = useState('med');

  const handleSave = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Typography variant="body" color={theme.colors.primary}>Cancel</Typography>
        </TouchableOpacity>
        <Typography variant="headline">Edit</Typography>
        <TouchableOpacity onPress={handleSave}>
          <Typography variant="headline" color={theme.colors.primary}>Save</Typography>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Card style={styles.titleCard}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </Card>

        {/* Type */}
        <Typography 
          variant="footnote" 
          color={theme.colors.textSecondary}
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
          color={theme.colors.textSecondary}
          style={styles.label}
        >
          PRIORITY
        </Typography>
        <View style={styles.chipRow}>
          <Chip label="High" selected={priority === 'high'} onPress={() => setPriority('high')} />
          <Chip label="Medium" selected={priority === 'med'} onPress={() => setPriority('med')} />
          <Chip label="Low" selected={priority === 'low'} onPress={() => setPriority('low')} />
        </View>

        {/* Date & Reminder */}
        <Typography 
          variant="footnote" 
          color={theme.colors.textSecondary}
          style={styles.label}
        >
          SCHEDULE
        </Typography>
        <Card style={styles.scheduleCard}>
          <TouchableOpacity style={styles.scheduleRow}>
            <Calendar size={20} color={theme.colors.primary} strokeWidth={2} />
            <Typography variant="body" style={{ marginLeft: 12, flex: 1 }}>
              Due Date
            </Typography>
            <Typography variant="body" color={theme.colors.textSecondary}>
              None
            </Typography>
            <ChevronRight size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.scheduleRow}>
            <Clock size={20} color={theme.colors.primary} strokeWidth={2} />
            <Typography variant="body" style={{ marginLeft: 12, flex: 1 }}>
              Reminder
            </Typography>
            <Typography variant="body" color={theme.colors.textSecondary}>
              None
            </Typography>
            <ChevronRight size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.separator,
    backgroundColor: theme.colors.card,
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
    color: theme.colors.text,
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
    backgroundColor: theme.colors.separator,
    marginLeft: 48,
  },
});
