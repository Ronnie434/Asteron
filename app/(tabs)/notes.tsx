import { View, ScrollView, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../src/ui/theme';
import { Typography } from '../../src/ui/components/Typography';
import { Card } from '../../src/ui/components/Card';
import { useItemsStore } from '../../src/store/useItemsStore';
import { Item } from '../../src/db/items';
import { FileText, Trash2, Edit2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';

export default function NotesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { items, init, deleteItem } = useItemsStore();

  useEffect(() => {
    init();
  }, []);

  // Filter for items with type 'note'
  const notes = items
    .filter(i => i.type === 'note' && i.status === 'active')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleEditNote = (note: Item) => {
    router.push({
      pathname: '/edit',
      params: {
        id: note.id,
        title: note.title,
        type: note.type,
        priority: note.priority,
        details: note.details || '',
        dueAt: note.dueAt || '',
        remindAt: note.remindAt || '',
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
      pointerEvents="box-none"
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContainer}>
            <Image 
              source={require('../../assets/AI_Companion_icon.png')}
              style={styles.headerIcon}
              resizeMode="contain"
            />
            <Typography variant="largeTitle">Notes</Typography>
          </View>
        </View>

        {notes.length > 0 ? (
          <View style={styles.notesGrid}>
            {notes.map((note) => (
              <Card key={note.id} style={styles.noteCard}>
                <TouchableOpacity 
                  onPress={() => handleEditNote(note)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 150,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
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
});
