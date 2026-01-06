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
  Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from './Typography';
import { Card } from './Card';
import { GlassyHeader } from './GlassyHeader';
import { theme } from '../theme';
import { useItemsStore } from '../../store/useItemsStore';
import { useResponsive } from '../useResponsive';

interface AddNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess?: (title: string) => void;
}

export function AddNoteModal({ visible, onClose, onSaveSuccess }: AddNoteModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktop, contentWidth } = useResponsive();
  const { addItem, items } = useItemsStore();
  
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');

  const resetForm = () => {
    setTitle('');
    setDetails('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    
    const savedTitle = title.trim();
    
    await saveItem(savedTitle);
  };
  
  const saveItem = async (savedTitle: string) => {
    try {
      await addItem(savedTitle, {
        type: 'note',
        priority: 'med',
        details: details || null,
        status: 'active',
      });
      
      // Call success callback if provided
      if (onSaveSuccess) {
        onSaveSuccess(savedTitle);
      }
      
      handleClose();
    } catch (e) {
      console.error('Failed to add note:', e);
      Alert.alert('Error', 'Failed to save note. Please try again.');
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
        <View style={[
          styles.container,
          {
            backgroundColor: colors.background,
            alignItems: isDesktop ? 'center' : undefined,
          }
        ]}>
          <View style={[
            styles.innerContainer,
            isDesktop && { width: contentWidth, maxWidth: 700 }
          ]}>
            {/* Floating Pill Header */}
            <GlassyHeader
              title="New Note"
              disableTopSafeArea
              isFloatingPill
              leftAction={
                <TouchableOpacity 
                  onPress={handleClose}
                  style={[styles.headerButton, { backgroundColor: colors.text + '10' }]}
                >
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              }
              rightAction={
                <TouchableOpacity 
                  onPress={handleSave}
                  style={[styles.headerButton, { backgroundColor: colors.primary + '20' }]}
                  disabled={!title.trim()}
                >
                  <Check size={20} color={title.trim() ? colors.primary : colors.textTertiary} />
                </TouchableOpacity>
              }
            />

          <KeyboardAvoidingView 
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView 
              style={styles.scrollContent}
              contentContainerStyle={{ 
                paddingTop: insets.top + 12 + 56 + 16, // safe area + header offset (12) + header height (56) + spacing (16)
                paddingBottom: insets.bottom + 40 
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Title */}
              <Card style={styles.titleCard}>
                <TextInput
                  style={[styles.titleInput, { color: colors.text }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Note Title"
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                />
              </Card>

              {/* Details */}
              <Typography variant="footnote" color={colors.textSecondary} style={styles.label}>
                CONTENT
              </Typography>
              <Card style={styles.detailsCard}>
                <TextInput
                  style={[styles.detailsInput, { color: colors.text }]}
                  value={details}
                  onChangeText={setDetails}
                  placeholder="Type your note here..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  textAlignVertical="top"
                />
              </Card>
            </ScrollView>
          </KeyboardAvoidingView>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    width: '100%',
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
  detailsCard: {
    padding: theme.spacing.md,
    flex: 1, 
    minHeight: 200,
  },
  detailsInput: {
    ...theme.typography.body,
    fontSize: 16,
    minHeight: 150,
  },
  label: {
    marginBottom: theme.spacing.sm,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
});
