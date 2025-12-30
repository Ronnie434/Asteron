import { View, ScrollView, StyleSheet, TouchableOpacity, Image, AppState, AppStateStatus, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronUp, Sun, Moon, Calendar, AlertCircle } from 'lucide-react-native';
import { theme, hexToRgba } from '../../src/ui/theme';
import { Typography } from '../../src/ui/components/Typography';
import { Card } from '../../src/ui/components/Card';
import { useItemsStore } from '../../src/store/useItemsStore';
import { NotificationService } from '../../src/services/NotificationService';
import { Item } from '../../src/db/items';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { RainbowSparkles } from '../../src/ui/components/RainbowSparkles';
import { GlassyHeader } from '../../src/ui/components/GlassyHeader';
import { TaskCelebration } from '../../src/ui/components/TaskCelebration';
import {
  expandRepeatingItems,
  getOverdueItems,
  getOverdueOccurrences,
  filterByDate,
  sortItemsByTimeAndStatus,
  getEffectiveDate,
  ExpandedItem,
} from '../../src/utils/repeatExpansion';

export default function BriefScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { items, init, loadItems, markAsDone, markAsUndone, updateItem, deleteItem, skipOccurrence } = useItemsStore();
  
  // Collapsible section states
  const [overdueExpanded, setOverdueExpanded] = useState(true);
  const [todayExpanded, setTodayExpanded] = useState(true);
  const [tomorrowExpanded, setTomorrowExpanded] = useState(true);
  const [dayAfterExpanded, setDayAfterExpanded] = useState(true);
  
  // Track completed occurrence keys (itemId:dateString) for per-occurrence completion
  const [completedOccurrenceKeys, setCompletedOccurrenceKeys] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  
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

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);

  // Get overdue items: regular items from past days + past uncompleted repeating occurrences
  // Now tracks back 3 days and uses persisted completedDates
  const regularOverdue = getOverdueItems(items);
  const repeatingOverdue = getOverdueOccurrences(items);
  const overdueItems = sortItemsByTimeAndStatus([...regularOverdue, ...repeatingOverdue]);

  // Expand repeating items for the next 3 days
  const expandedItems = expandRepeatingItems(items, 3);

  // Custom sort that accounts for locally completed occurrences and DB completion status
  const sortWithLocalCompletion = (items: ExpandedItem[], targetDate: Date) => {
    return [...items].sort((a, b) => {
      // Use each item's specific displayDate for the key, not the section's targetDate
      const aKey = `${a.id}:${a.displayDate.toDateString()}`;
      const bKey = `${b.id}:${b.displayDate.toDateString()}`;
      // Check both local state AND DB isCompleted flag
      const aCompleted = a.status === 'done' || a.isCompleted || completedOccurrenceKeys.has(aKey);
      const bCompleted = b.status === 'done' || b.isCompleted || completedOccurrenceKeys.has(bKey);
      
      // Completed items go to end
      if (aCompleted && !bCompleted) return 1;
      if (!aCompleted && bCompleted) return -1;
      
      // Sort by time
      return a.displayDate.getTime() - b.displayDate.getTime();
    });
  };

  // Filter by date and sort (with local completion awareness)
  const todayItems = sortWithLocalCompletion(filterByDate(expandedItems, now), now).slice(0, 8);
  const tomorrowItems = sortWithLocalCompletion(filterByDate(expandedItems, tomorrow), tomorrow).slice(0, 4);
  const dayAfterItems = sortWithLocalCompletion(filterByDate(expandedItems, dayAfter), dayAfter).slice(0, 4);

  const handleToggleItem = async (item: Item, occurrenceDate?: Date) => {
    // Generate a key for this specific occurrence
    const occurrenceKey = occurrenceDate 
      ? `${item.id}:${occurrenceDate.toDateString()}` 
      : item.id;
    
    // Check if this occurrence is marked as completed locally OR from DB
    const isLocallyCompleted = completedOccurrenceKeys.has(occurrenceKey);
    const isDbCompleted = (item as ExpandedItem).isCompleted;
    const isDone = item.status === 'done' || isDbCompleted || isLocallyCompleted;
    
    if (isDone) {
      // Uncheck: remove from local state and call store's markAsUndone
      if (isLocallyCompleted) {
        setCompletedOccurrenceKeys(prev => {
          const newSet = new Set(prev);
          newSet.delete(occurrenceKey);
          return newSet;
        });
      }

      // Use centralized store function for unchecking (handles notifications)
      await markAsUndone(item.id, occurrenceDate);
    } else {
      // Check: add to local completed set, show celebration, and mark done
      setShowCelebration(true);
      setCompletedOccurrenceKeys(prev => new Set(prev).add(occurrenceKey));
      
      // Cancel this occurrence's notification and mark as done in DB
      await markAsDone(item.id, occurrenceDate);
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
        repeat: item.repeat || 'none',
        repeatConfig: item.repeatConfig || '',
      }
    });
  };

  const handleDeleteItem = (item: Item, occurrenceDate?: Date) => {
    // If it's a repeating item, show options
    if (item.repeat && item.repeat !== 'none' && occurrenceDate) {
      Alert.alert(
        'Delete Repeating Task',
        `"${item.title}" repeats ${item.repeat}. What would you like to delete?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'This Day Only',
            onPress: async () => {
              await skipOccurrence(item.id, occurrenceDate);
              await loadItems(); // Refresh the list
            },
          },
          {
            text: 'All Occurrences',
            style: 'destructive',
            onPress: async () => {
              await deleteItem(item.id);
              await loadItems();
            },
          },
        ]
      );
    } else {
      // Non-repeating: just confirm deletion
      Alert.alert(
        'Delete Task',
        `Are you sure you want to delete "${item.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteItem(item.id);
              await loadItems();
            },
          },
        ]
      );
    }
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

  const TaskRow = ({ item, isOverdue = false, occurrenceDate }: { item: Item; isOverdue?: boolean; occurrenceDate?: Date }) => {
    const effectiveDate = getEffectiveDate(item);
    const time = effectiveDate
      ? new Date(effectiveDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';
    
    // Check if this specific occurrence is locally completed
    const occurrenceKey = occurrenceDate 
      ? `${item.id}:${occurrenceDate.toDateString()}` 
      : item.id;
    const isLocallyCompleted = completedOccurrenceKeys.has(occurrenceKey);
    // Use isCompleted from ExpandedItem (DB state) for repeating tasks
    const isDbCompleted = (item as ExpandedItem).isCompleted;
    const isDone = item.status === 'done' || isDbCompleted || isLocallyCompleted;
    
    const priorityColor = getPriorityColor(item.priority);
    
    // Calculate the actual reminder/due time for this specific occurrence
    // For repeating items, use occurrenceDate; for regular items, use remindAt
    const occurrenceTime = occurrenceDate || (item.remindAt ? new Date(item.remindAt) : null);
    
    // Get start of today for comparison
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    // isOverdue prop means this item is rendered in the OVERDUE section (previous day)
    // isOverdueStyle = should show warning styling (time has passed, today or previous day)
    const isTimePassed = occurrenceTime && occurrenceTime <= now;
    const isOverdueStyle = isOverdue || (!isDone && isTimePassed);
      
    return (
      <View style={[
        styles.taskRow, 
        { backgroundColor: colors.card },
        // Highlight overdue reminders with a colored border
        isOverdueStyle && {
          borderWidth: 2,
          borderColor: isOverdue ? colors.danger : colors.warning,
          backgroundColor: isOverdue ? hexToRgba(colors.danger, 0.1) : hexToRgba(colors.warning, 0.1), // Very subtle tint  
        }
      ]}>
        {/* Checkbox */}
        <TouchableOpacity 
          onPress={() => handleToggleItem(item, occurrenceDate)}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={[
            styles.checkbox, 
            { borderColor: isDone ? colors.success : (isOverdueStyle ? colors.warning : priorityColor) },
            isDone && { backgroundColor: colors.success, borderColor: colors.success }
          ]}>
            {isDone && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
          </View>
        </TouchableOpacity>
        
        {/* Task content - tap to edit (only if not done), long-press to delete */}
        <TouchableOpacity 
          style={styles.taskContent}
          onPress={() => {
            if (isDone) {
              // Allow unchecking by tapping the body
              handleToggleItem(item, occurrenceDate);
            } else {
              handleEditItem(item);
            }
          }}
          onLongPress={() => handleDeleteItem(item, occurrenceDate)}
          activeOpacity={0.6}
        >
          <Typography 
            variant="body" 
            style={isDone ? { textDecorationLine: 'line-through', opacity: 0.5 } : undefined}
          >
            {item.title}
          </Typography>
          {/* Show "Overdue" label for overdue reminders */}
          {isOverdueStyle && (
            <Typography variant="caption2" color={colors.warning} style={{ marginTop: 2 }}>
              ⏰ Reminder overdue
            </Typography>
          )}
        </TouchableOpacity>
        
        {time ? (
          <TouchableOpacity 
            onPress={() => {
              if (!isDone) {
                handleEditItem(item);
              } else {
                handleToggleItem(item, occurrenceDate);
              }
            }}
            activeOpacity={isDone ? 1 : 0.6}
          >
            <Typography 
              variant="caption2" 
              color={isOverdueStyle ? colors.warning : colors.textSecondary}
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
            {/* Overdue Section */}
            {overdueItems.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity 
                  style={[styles.sectionHeader, { backgroundColor: hexToRgba(colors.danger, 0.15) }]}
                  onPress={() => setOverdueExpanded(!overdueExpanded)}
                  activeOpacity={0.7}
                >
                  <AlertCircle size={18} color={colors.danger} />
                  <Typography variant="headline" style={{ textTransform: 'uppercase', letterSpacing: 1, color: colors.danger }}>
                    Overdue ({overdueItems.length})
                  </Typography>
                  <ChevronUp 
                    size={18} 
                    color={colors.danger}
                    style={{ transform: [{ rotate: overdueExpanded ? '0deg' : '180deg' }] }}
                  />
                </TouchableOpacity>
                {overdueExpanded && overdueItems.map((item) => (
                  <TaskRow 
                    key={`${item.id}-${(item as any).displayDate ? (item as any).displayDate.getTime() : 'single'}`} 
                    item={item} 
                    isOverdue 
                    occurrenceDate={(item as any).displayDate}
                  />
                ))}
              </View>
            )}

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
                    <TaskRow key={`today-${item.id}`} item={item} occurrenceDate={item.displayDate} />
                  ))}
                  {todayItems.length === 0 && (
                    <Typography variant="body" color={colors.textSecondary} style={{ paddingVertical: 8 }}>
                       No tasks for today.
                    </Typography>
                  )}
                </>
              )}
            </View>

            {/* Tomorrow Section */}
            {tomorrowItems.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity 
                  style={[styles.sectionHeader, { backgroundColor: colors.surfaceSecondary }]}
                  onPress={() => setTomorrowExpanded(!tomorrowExpanded)}
                  activeOpacity={0.7}
                >
                  <Moon size={18} color={colors.textSecondary} />
                  <Typography variant="headline" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    Tomorrow ({tomorrowItems.length})
                  </Typography>
                  <ChevronUp 
                    size={18} 
                    color={colors.textSecondary}
                    style={{ transform: [{ rotate: tomorrowExpanded ? '0deg' : '180deg' }] }}
                  />
                </TouchableOpacity>
                {tomorrowExpanded && tomorrowItems.map((item) => (
                  <TaskRow key={`tomorrow-${item.id}`} item={item} occurrenceDate={item.displayDate} />
                ))}
              </View>
            )}

            {/* Day After Tomorrow Section */}
            {dayAfterItems.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity 
                  style={[styles.sectionHeader, { backgroundColor: colors.surfaceSecondary }]}
                  onPress={() => setDayAfterExpanded(!dayAfterExpanded)}
                  activeOpacity={0.7}
                >
                  <Calendar size={18} color={colors.textSecondary} />
                  <Typography variant="headline" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    {dayAfter.toLocaleDateString('en-US', { weekday: 'long' })} ({dayAfterItems.length})
                  </Typography>
                  <ChevronUp 
                    size={18} 
                    color={colors.textSecondary}
                    style={{ transform: [{ rotate: dayAfterExpanded ? '0deg' : '180deg' }] }}
                  />
                </TouchableOpacity>
                {dayAfterExpanded && dayAfterItems.map((item) => (
                  <TaskRow key={`dayAfter-${item.id}`} item={item} occurrenceDate={item.displayDate} />
                ))}
              </View>
            )}
            
            {/* Additional Mock Content to enable scrolling demonstration if needed */}
            <Typography variant="footnote" color={colors.textTertiary} style={{ marginTop: 20, textAlign: 'center' }}>
              That's all for now.
            </Typography>
      </ScrollView>

      <TaskCelebration 
        isVisible={showCelebration} 
        onComplete={() => setShowCelebration(false)} 
      />
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
