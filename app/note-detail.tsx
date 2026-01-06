import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../src/ui/theme';
import { Typography } from '../src/ui/components/Typography';
import { Card } from '../src/ui/components/Card';
import { Button } from '../src/ui/components/Button';
import { Clock, Trash2, X, Check } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useItemsStore } from '../src/store/useItemsStore';
import { useTheme } from '../src/contexts/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GlassyHeader } from '../src/ui/components/GlassyHeader';

export default function NoteDetailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { updateItem, deleteItem } = useItemsStore();
  const params = useLocalSearchParams<{ 
    id: string;
    title?: string; 
    details?: string;
  }>();
  
  const itemId = params.id;
  const [title, setTitle] = useState(params.title || '');
  const [details, setDetails] = useState(params.details || '');
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Reminder modal
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const handleSave = async () => {
    if (!title.trim() || !itemId) return;
    try {
      await updateItem(itemId, {
        title,
        details: details || null,
      });
      setHasChanges(false);
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to update note:', e);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            if (itemId) {
              await deleteItem(itemId);
              router.back();
            }
          }
        },
      ]
    );
  };

  const handleSetReminder = async () => {
    if (!itemId) return;
    try {
      await updateItem(itemId, {
        remindAt: tempDate.toISOString(),
        type: 'reminder', // Change type to reminder so it appears in Upcoming
      });
      setShowReminderModal(false);
      Alert.alert(
        'Reminder Set',
        `You'll be reminded on ${tempDate.toLocaleDateString()} at ${tempDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/upcoming') }]
      );
    } catch (e) {
      console.error('Failed to set reminder:', e);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'Do you want to save your changes?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
          { text: 'Save', onPress: async () => { await handleSave(); router.back(); } },
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlassyHeader
        title="Note"
        disableTopSafeArea
        isFloatingPill
        isModalSheet
        leftAction={
          <TouchableOpacity 
            onPress={handleBack}
            style={[styles.iconButton, { backgroundColor: colors.text + '10' }]}
          >
            <X size={22} color={colors.text} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity 
            onPress={handleSave}
            style={[styles.iconButton, { backgroundColor: hasChanges ? colors.primary + '20' : colors.text + '10' }]}
          >
            <Check size={22} color={hasChanges ? colors.primary : colors.textTertiary} />
          </TouchableOpacity>
        }
      />

      <ScrollView 
        contentContainerStyle={[
          styles.content, 
          { paddingTop: 8 + 56 + 16 } // compact: header offset (8) + header height (56) + spacing (16)
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.noteCard}>
          <TextInput
            style={[styles.titleInput, { color: colors.text }]}
            value={title}
            onChangeText={(t) => { setTitle(t); setHasChanges(true); }}
            placeholder="Title"
            placeholderTextColor={colors.textTertiary}
            multiline
          />
          
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
          
          <TextInput
            style={[styles.detailsInput, { color: colors.text }]}
            value={details}
            onChangeText={(d) => { setDetails(d); setHasChanges(true); }}
            placeholder="Write your note here..."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
          />
        </Card>

        {hasChanges && (
          <Button 
            label="Save Changes"
            onPress={handleSave}
            variant="primary"
            style={{ marginTop: theme.spacing.lg }}
          />
        )}

        {/* Set Reminder Button */}
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
          onPress={() => setShowReminderModal(true)}
          activeOpacity={0.7}
        >
          <Clock size={20} color={colors.primary} strokeWidth={2} />
          <Typography variant="body" color={colors.primary} style={{ marginLeft: 8 }}>
            Set Reminder
          </Typography>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.danger + '15' }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Trash2 size={20} color={colors.danger} strokeWidth={2} />
          <Typography variant="body" color={colors.danger} style={{ marginLeft: 8 }}>
            Delete Note
          </Typography>
        </TouchableOpacity>
      </ScrollView>

      {/* Reminder Modal */}
      <Modal visible={showReminderModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowReminderModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Typography variant="headline">Set Reminder</Typography>
              <TouchableOpacity onPress={() => setShowReminderModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <Typography variant="body" color={colors.textSecondary} style={{ marginBottom: theme.spacing.md }}>
              This note will move to Upcoming when you set a reminder.
            </Typography>
            
            <DateTimePicker
              value={tempDate}
              mode="datetime"
              display="spinner"
              onChange={(e, date) => date && setTempDate(date)}
              style={{ height: 150 }}
            />
            
            <Button label="Set Reminder" onPress={handleSetReminder} variant="primary" />
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

  content: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  noteCard: {
    padding: theme.spacing.lg,
  },
  titleInput: {
    ...theme.typography.title2,
    fontSize: 24,
    marginBottom: theme.spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: theme.spacing.md,
  },
  detailsInput: {
    ...theme.typography.body,
    fontSize: 17,
    lineHeight: 26,
    minHeight: 200,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
