import { View, ScrollView, StyleSheet, TouchableOpacity, Image, AppState, AppStateStatus } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronUp, Sun, Moon } from 'lucide-react-native';
import { theme } from '../../src/ui/theme';
import { Typography } from '../../src/ui/components/Typography';
import { Card } from '../../src/ui/components/Card';
import { useItemsStore } from '../../src/store/useItemsStore';
import { Item } from '../../src/db/items';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { RainbowSparkles } from '../../src/ui/components/RainbowSparkles';
import { GlassyHeader } from '../../src/ui/components/GlassyHeader';

export default function BriefScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { items, init, loadItems, markAsDone, updateItem } = useItemsStore();
  
  // Collapsible section states
  const [todayExpanded, setTodayExpanded] = useState(true);
  const [soonExpanded, setSoonExpanded] = useState(true);
  
  // Force re-render when time changes (for overdue detection)
  const [refreshKey, setRefreshKey] = useState(0);
  const appState = useRef(AppState.currentState);
  
  useEffect(() => {
    init();
  }, []);

  // Refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Refresh items and trigger re-render to update overdue status
        loadItems();
        setRefreshKey(prev => prev + 1);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [loadItems]);

  const now = new Date();

  // Helper to get the effective date (dueAt or remindAt)
  const getEffectiveDate = (item: Item): string | null => {
    return item.dueAt || item.remindAt || null;
  };
  
  // Include both active AND done items for today, sort by time then done items to end
  const todayItems = items
    .filter(i => {
      if (i.status !== 'active' && i.status !== 'done') return false;
      const effectiveDate = getEffectiveDate(i);
      if (!effectiveDate) return false;
      return new Date(effectiveDate).toDateString() === now.toDateString();
    })
    .sort((a, b) => {
      // First: sort done items to the end
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      // Then: sort by time (earliest first)
      const aDate = new Date(getEffectiveDate(a)!).getTime();
      const bDate = new Date(getEffectiveDate(b)!).getTime();
      return aDate - bDate;
    });
  
  // Only active upcoming items, sorted by time (earliest first)
  // Include both active AND done items for soon section, sort by time then done items to end
  const upcomingItems = items
    .filter(i => {
      if (i.status !== 'active' && i.status !== 'done') return false;
      const effectiveDate = getEffectiveDate(i);
      if (!effectiveDate) return false;
      const date = new Date(effectiveDate);
      return date > now && date.toDateString() !== now.toDateString();
    })
    .sort((a, b) => {
      // First: sort done items to the end
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      // Then: sort by time (earliest first)
      const aDate = new Date(getEffectiveDate(a)!).getTime();
      const bDate = new Date(getEffectiveDate(b)!).getTime();
      return aDate - bDate;
    })
    .slice(0, 4);

  const handleToggleItem = async (item: Item) => {
    if (item.status === 'done') {
      // Uncheck - set back to active
      await updateItem(item.id, { status: 'active' });
    } else {
      // Check - mark as done
      await markAsDone(item.id);
    }
  };

  const handleEditItem = (item: Item) => {
    router.push({
      pathname: '/edit',
      params: {
        id: item.id,
        title: item.title,
        type: item.type,
        priority: item.priority,
        details: item.details || '',
        dueAt: item.dueAt || '',
        remindAt: item.remindAt || '',
      }
    });
  };

  // Priority color mapping
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return colors.danger;  // Red for high priority
      case 'med':
        return colors.warning; // Amber for medium priority
      case 'low':
      default:
        return colors.textTertiary; // Subtle gray for low priority
    }
  };

  const TaskRow = ({ item }: { item: Item }) => {
    const effectiveDate = getEffectiveDate(item);
    const time = effectiveDate
      ? new Date(effectiveDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';
    const isDone = item.status === 'done';
    const priorityColor = getPriorityColor(item.priority);
    
    // Check if this task has an overdue reminder (reminder time passed but not done)
    const isOverdueReminder = !isDone && item.remindAt && new Date(item.remindAt) <= now;
      
    return (
      <View style={[
        styles.taskRow, 
        { backgroundColor: colors.card },
        // Highlight overdue reminders with a colored border
        isOverdueReminder && {
          borderWidth: 2,
          borderColor: colors.warning,
          backgroundColor: `${colors.warning}10`, // Very subtle tint  
        }
      ]}>
        {/* Checkbox - only toggles completion, colored by priority */}
        <TouchableOpacity 
          onPress={() => handleToggleItem(item)}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={[
            styles.checkbox, 
            { borderColor: isDone ? colors.success : (isOverdueReminder ? colors.warning : priorityColor) },
            isDone && { backgroundColor: colors.success, borderColor: colors.success }
          ]}>
            {isDone && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
          </View>
        </TouchableOpacity>
        
        {/* Task content - opens edit modal */}
        <TouchableOpacity 
          style={styles.taskContent}
          onPress={() => handleEditItem(item)}
          activeOpacity={0.6}
        >
          <Typography 
            variant="body" 
            style={isDone ? { textDecorationLine: 'line-through', opacity: 0.5 } : undefined}
          >
            {item.title}
          </Typography>
          {/* Show "Overdue" label for overdue reminders */}
          {isOverdueReminder && (
            <Typography variant="caption2" color={colors.warning} style={{ marginTop: 2 }}>
              ⏰ Reminder overdue
            </Typography>
          )}
        </TouchableOpacity>
        
        {time ? (
          <TouchableOpacity 
            onPress={() => handleEditItem(item)}
            activeOpacity={0.6}
          >
            <Typography 
              variant="caption2" 
              color={isOverdueReminder ? colors.warning : colors.textSecondary}
              style={isDone ? { opacity: 0.5 } : undefined}
            >
              {time}
            </Typography>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlassyHeader
        rightAction={
          <TouchableOpacity 
            onPress={() => router.push('/capture')}
            activeOpacity={0.6}
          >
            <RainbowSparkles size={24} />
          </TouchableOpacity>
        }
      >
        <View style={styles.briefTitleContainer}>
          <Image 
            source={require('../../assets/AI_Companion_icon.png')}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Typography variant="headline">Daily Brief</Typography>
        </View>
      </GlassyHeader>

      <ScrollView 
        contentContainerStyle={[
           styles.content,
           { paddingTop: insets.top + 80 }
        ]}
        showsVerticalScrollIndicator={false}
      >
            {/* Today Section */}
            <View style={styles.section}>
              <TouchableOpacity 
                style={[styles.sectionHeader, { backgroundColor: colors.primaryLight }]}
                onPress={() => setTodayExpanded(!todayExpanded)}
                activeOpacity={0.7}
              >
                <Sun size={18} color={colors.primary} />
                <Typography variant="headline" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  Today ({todayItems.length})
                </Typography>
                <ChevronUp 
                  size={18} 
                  color={colors.primary}
                  style={{ transform: [{ rotate: todayExpanded ? '0deg' : '180deg' }] }}
                />
              </TouchableOpacity>
              {todayExpanded && (
                <>
                  {todayItems.map((item) => (
                    <TaskRow key={item.id} item={item} />
                  ))}
                  {todayItems.length === 0 && (
                    <Typography variant="body" color={colors.textSecondary} style={{ paddingVertical: 8 }}>
                       No tasks for today.
                    </Typography>
                  )}
                </>
              )}
            </View>

            {/* Coming Up Section */}
            {upcomingItems.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity 
                  style={[styles.sectionHeader, { backgroundColor: colors.surfaceSecondary }]}
                  onPress={() => setSoonExpanded(!soonExpanded)}
                  activeOpacity={0.7}
                >
                  <Moon size={18} color={colors.textSecondary} />
                  <Typography variant="headline" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    Soon ({upcomingItems.length})
                  </Typography>
                  <ChevronUp 
                    size={18} 
                    color={colors.textSecondary}
                    style={{ transform: [{ rotate: soonExpanded ? '0deg' : '180deg' }] }}
                  />
                </TouchableOpacity>
                {soonExpanded && upcomingItems.map((item) => (
                  <TaskRow key={item.id} item={item} />
                ))}
              </View>
            )}
            
            {/* Additional Mock Content to enable scrolling demonstration if needed */}
            <Typography variant="footnote" color={colors.textTertiary} style={{ marginTop: 20, textAlign: 'center' }}>
              That's all for now.
            </Typography>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1, // fill the screen
    paddingHorizontal: theme.spacing.md,
    paddingTop: 0,
    paddingBottom: 120,
  },

  // Brief Card Styles
  briefCard: {
    padding: theme.spacing.lg,
    paddingBottom: 0, // Remove bottom padding from card implementation to allow scrollview to handle it
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden', // Ensure content clips to rounded corners
  },
  briefTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    marginRight: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  taskContent: {
    flex: 1,
  },
  mainCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    // Add shadow for elevated look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(60, 60, 67, 0.12)',
    marginVertical: theme.spacing.lg,
  },
});
