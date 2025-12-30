import { View, ScrollView, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/ui/theme';
import { Typography } from '../../src/ui/components/Typography';
import { Card } from '../../src/ui/components/Card';
import { useItemsStore } from '../../src/store/useItemsStore';
import { Item } from '../../src/db/items';
import { FileText, Trash2, Edit2, Plus, Search, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { TextInput } from 'react-native';
import { AddNoteModal } from '../../src/ui/components/AddNoteModal';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { GlassyHeader } from '../../src/ui/components/GlassyHeader';

export default function NotesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, init, deleteItem } = useItemsStore();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    init();
  }, []);

  // Filter for items with type 'note'
  const notes = items
    .filter(i => i.type === 'note' && i.status === 'active')
    .filter(i => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        i.title.toLowerCase().includes(query) || 
        (i.details && i.details.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleOpenNote = (note: Item) => {
    router.push({
      pathname: '/note-detail',
      params: {
        id: note.id,
        title: note.title,
        details: note.details || '',
      }
    });
  };

  const handleDeleteNote = (id: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => await deleteItem(id)
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlassyHeader title="Notes" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 80 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search notes..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {notes.length > 0 ? (
          <View style={styles.notesGrid}>
            {notes.map((note) => (
              <Card key={note.id} style={styles.noteCard}>
                <TouchableOpacity 
                  onPress={() => handleOpenNote(note)}
                  activeOpacity={0.7}
                >
                  <View style={styles.noteHeader}>
                    <FileText size={20} color={colors.primary} />
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity onPress={() => handleDeleteNote(note.id)}>
                      <Trash2 size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                  
                  <Typography variant="headline" style={styles.noteTitle} numberOfLines={2}>
                    {note.title}
                  </Typography>
                  
                  {note.details ? (
                    <Typography 
                      variant="body" 
                      color={colors.textSecondary} 
                      numberOfLines={4}
                      style={styles.noteDetails}
                    >
                      {note.details}
                    </Typography>
                  ) : null}
                  
                  <Typography variant="caption2" color={colors.textTertiary} style={styles.noteDate}>
                    {new Date(note.createdAt).toLocaleDateString()}
                  </Typography>
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <FileText 
              size={48} 
              color={colors.textTertiary} 
              strokeWidth={1.5}
            />
            <Typography 
              variant="callout" 
              color={colors.textSecondary}
              style={{ marginTop: 16, textAlign: 'center' }}
            >
              No notes yet.{'\n'}Speak to create one.
            </Typography>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 100 }]}
        onPress={() => setIsAddModalVisible(true)}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>

      <AddNoteModal 
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingTop: 0,
    paddingBottom: 150,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: theme.spacing.lg,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    fontSize: 16,
    padding: 0, // Reset default padding
  },

  notesGrid: {
    gap: theme.spacing.md,
  },
  noteCard: {
    padding: theme.spacing.md,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  noteTitle: {
    marginBottom: theme.spacing.xs,
  },
  noteDetails: {
    marginBottom: theme.spacing.md,
  },
  noteDate: {
    alignSelf: 'flex-end',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});
