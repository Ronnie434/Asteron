import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/ui/theme';
import { Typography } from '../../src/ui/components/Typography';
import { Card } from '../../src/ui/components/Card';
import { MOCK_ITEMS } from '../../src/data/mock';
import { Item } from '../../src/db/items';
import { useState } from 'react';

export default function DailyBriefMock() {
  const [items, setItems] = useState<Item[]>(MOCK_ITEMS);

  const toggleItem = (id: string) => {
    // Just mock toggle for visual
    setItems(current => 
      current.map(i => i.id === id ? { ...i, status: i.status === 'done' ? 'active' : 'done' } : i)
    );
  };

  const todayItems = items.filter(i => i.status === 'active' && new Date(i.dueAt!).getDate() === new Date('2025-01-03').getDate());
  const soonItems = items.filter(i => i.status === 'active' && new Date(i.dueAt!).getDate() > new Date('2025-01-03').getDate());

  const renderItem = (item: Item) => {
    const isDone = item.status === 'done';
    const date = item.dueAt ? new Date(item.dueAt) : null;
    const timeStr = date ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    const dateStr = date ? date.toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

    return (
      <TouchableOpacity 
        key={item.id} 
        style={styles.itemRow} 
        onPress={() => toggleItem(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, isDone && styles.checkboxChecked]}>
           {isDone && <Ionicons name="checkmark" size={16} color="white" />}
        </View>
        <View style={styles.itemContent}>
          <Typography 
            variant="body" 
            style={[styles.itemText, isDone && styles.itemTextDone]}
            numberOfLines={1}
          >
            {item.title}
          </Typography>
        </View>
        <View style={styles.itemMeta}>
           {timeStr ? <Typography variant="caption" style={styles.dateText}>{timeStr}</Typography> : null}
           {dateStr && !todayItems.includes(item) ? <Typography variant="caption" style={styles.dateText}>{dateStr}</Typography> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Typography variant="h1" style={styles.headerTitle}>Daily Brief</Typography>
          <Ionicons name="sparkles" size={24} color={theme.colors.primaryLight} />
        </View>

        <Card style={styles.mainCard}>
          {/* Today Section */}
          <View style={styles.sectionHeader}>
            <Typography variant="h3">Today</Typography>
          </View>
          
          <View style={styles.list}>
            {todayItems.map(renderItem)}
          </View>

          <View style={styles.divider} />

          {/* Soon Section */}
          <View style={styles.sectionHeader}>
            <Typography variant="h3">Soon</Typography>
          </View>
          
          <View style={styles.list}>
            {soonItems.map(renderItem)}
          </View>
        </Card>
        
      </ScrollView>

      {/* Bottom Nav Mock (Visual only, since we are in a stack) */}
      <View style={styles.bottomNav}>
         <Ionicons name="home" size={24} color={theme.colors.primary} />
         <Ionicons name="chatbubble-outline" size={24} color={theme.colors.textSecondary} />
         <Ionicons name="calendar-outline" size={24} color={theme.colors.textSecondary} />
         <Ionicons name="person-outline" size={24} color={theme.colors.textSecondary} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Light gray bg
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xs,
  },
  headerTitle: {
    color: theme.colors.text,
  },
  mainCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    // Add shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  list: {
    gap: theme.spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primaryLight,
    marginRight: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontWeight: '500',
    color: theme.colors.text,
  },
  itemTextDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
  },
  itemMeta: {
    marginLeft: theme.spacing.sm,
  },
  dateText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  }
});
