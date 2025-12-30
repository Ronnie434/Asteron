import { View, ScrollView, StyleSheet, Image, TouchableOpacity, Animated, AppState, AppStateStatus, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { theme, hexToRgba } from '../../src/ui/theme';
import { Typography } from '../../src/ui/components/Typography';
import { Card } from '../../src/ui/components/Card';
import { useItemsStore } from '../../src/store/useItemsStore';
import { Item } from '../../src/db/items';
import { Calendar, Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { GlassyHeader } from '../../src/ui/components/GlassyHeader';
import { CalendarModal } from '../../src/ui/components/CalendarModal';
import { expandRepeatingItems, ExpandedItem, getEffectiveDate } from '../../src/utils/repeatExpansion';

export default function UpcomingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, init, loadItems, deleteItem, skipOccurrence } = useItemsStore();

  // Force re-render when time changes (for overdue detection)
  const [refreshKey, setRefreshKey] = useState(0);
  const appState = useRef(AppState.currentState);
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);

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
  
  // Calculate 30 days from now
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  thirtyDaysFromNow.setHours(23, 59, 59, 999);

  // Use shared expansion utility which includes completed items with isCompleted flag
  const expandedItems = expandRepeatingItems(items, 30, false);

  // Sort by display date, with completed items at the end of each group
  const upcoming = [...expandedItems].sort((a, b) => {
    // Completed items go to end
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;
    // Sort by time
    return a.displayDate.getTime() - b.displayDate.getTime();
  });

  // Items without any date (excluding notes and repeating tasks since they show above)
  const unscheduled = items.filter(i => 
    i.status === 'active' && 
    !getEffectiveDate(i) && 
    i.type !== 'note' &&
    (!i.repeat || i.repeat === 'none')
  );

  // Group by date
  const grouped: { [key: string]: ExpandedItem[] } = {};
  upcoming.forEach(item => {
    const key = item.displayDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

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
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'This Day Only',
            onPress: async () => {
              await skipOccurrence(item.id, occurrenceDate);
              await loadItems();
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
      // Non-repeating: confirm and delete
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

  const renderRightActions = (item: Item, displayDate: Date | undefined, progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });
    
    return (
      <Animated.View style={[styles.deleteAction, { transform: [{ translateX }] }]}>
        <TouchableOpacity 
          style={[styles.deleteButton, { backgroundColor: colors.danger }]}
          onPress={() => handleDeleteItem(item, displayDate)}
        >
          <Trash2 size={22} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const ItemRow = ({ item, showTime = true, displayDate }: { item: Item; showTime?: boolean; displayDate?: Date }) => {
    const swipeableRef = useRef<Swipeable>(null);
    
    // Check if this occurrence is completed (from expansion utility)
    const isCompleted = (item as ExpandedItem).isCompleted || item.status === 'done';
    
    // Check if this task has an overdue reminder
    // Logic: 
    // 1. Must be active, NOT completed, and have a reminder set
    // 2. If displayDate is provided (repeating/virtual item):
    //    - Overdue only if displayDate is today AND time has passed
    //    - NEVER overdue if displayDate is in the future
    // 3. If no displayDate (regular item):
    //    - Overdue if remindAt < now
    const checkOverdue = () => {
      // Never mark completed items as overdue
      if (isCompleted) return false;
      if (item.status !== 'active' || !item.remindAt) return false;
      
      const now = new Date();
      if (displayDate) {
        // If it's a future date (tomorrow+), it can't be overdue
        if (displayDate.toDateString() !== now.toDateString() && displayDate > now) return false;
        
        // If it's today, check if time has passed
        if (displayDate.toDateString() === now.toDateString()) {
             // For repeating items, displayDate has the correct time set
             return displayDate < now;
        }
        
        // If displayDate is in the past (yesterday etc), it's overdue
        return displayDate < now;
      }
      
      // Fallback for standard items
      return new Date(item.remindAt) <= now;
    };

    const isOverdueReminder = checkOverdue();
    
    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={(progress) => renderRightActions(item, displayDate, progress)}
        rightThreshold={40}
        overshootRight={false}
      >
        <TouchableOpacity 
          style={[
            styles.itemRow, 
            { backgroundColor: colors.card },
            // Highlight overdue reminders (but not completed ones)
            isOverdueReminder && !isCompleted && {
              borderLeftWidth: 4,
              borderLeftColor: colors.warning,
              backgroundColor: hexToRgba(colors.warning, 0.1),
            }
          ]}
          onPress={() => handleEditItem(item)}
          activeOpacity={0.7}
        >
          <View style={styles.timeColumn}>
            {showTime && getEffectiveDate(item) ? (
              <Typography 
                variant="headline" 
                color={isCompleted ? colors.textTertiary : (isOverdueReminder ? colors.warning : colors.text)}
                style={isCompleted ? { textDecorationLine: 'line-through' } : undefined}
              >
                {new Date(getEffectiveDate(item)!).toLocaleTimeString([], { 
                  hour: 'numeric', 
                  minute: '2-digit' 
                })}
              </Typography>
            ) : (
              <Typography variant="headline" color={colors.textTertiary}>
                —
              </Typography>
            )}
          </View>
          <View style={styles.itemContent}>
            <Typography 
              variant="body"
              style={isCompleted ? { textDecorationLine: 'line-through', opacity: 0.5 } : undefined}
            >
              {item.title}
            </Typography>
            <Typography 
              variant="caption1" 
              color={isCompleted ? colors.textTertiary : (isOverdueReminder ? colors.warning : colors.textSecondary)}
            >
              {isCompleted ? '✓ Completed' : (isOverdueReminder ? '⏰ Reminder overdue' : item.type)}
            </Typography>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlassyHeader 
        title="Upcoming" 
        rightAction={
          <TouchableOpacity 
            onPress={() => setIsCalendarModalVisible(true)}
            style={styles.calendarButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Calendar size={22} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        }
      />

      <CalendarModal
        isVisible={isCalendarModalVisible}
        onClose={() => setIsCalendarModalVisible(false)}
        items={items}
        onItemPress={(item) => {
          setIsCalendarModalVisible(false);
          handleEditItem(item);
        }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 80 }
        ]}
        showsVerticalScrollIndicator={false}
      >

        {Object.entries(grouped).map(([date, dateItems]) => (
          <View key={date} style={styles.section}>
            <Typography 
              variant="footnote" 
              color={colors.textSecondary}
              style={styles.dateLabel}
            >
              {date.toUpperCase()}
            </Typography>
            <Card style={styles.itemsCard}>
              {dateItems.map((item, index) => (
                <View key={item.id}>
                  <ItemRow item={item} displayDate={item.displayDate} />
                  {index < dateItems.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: colors.separator }]} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        ))}

        {/* Unscheduled Items */}
        {unscheduled.length > 0 && (
          <View style={styles.section}>
            <Typography 
              variant="footnote" 
              color={colors.textSecondary}
              style={styles.dateLabel}
            >
              ANYTIME
            </Typography>
            <Card style={styles.itemsCard}>
              {unscheduled.map((item, index) => (
                <View key={item.id}>
                  <ItemRow item={item} showTime={false} />
                  {index < unscheduled.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: colors.separator }]} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        )}

        {upcoming.length === 0 && unscheduled.length === 0 && (
          <View style={styles.emptyState}>
            <Calendar 
              size={48} 
              color={colors.textTertiary} 
              strokeWidth={1.5}
            />
            <Typography 
              variant="callout" 
              color={colors.textSecondary}
              style={{ marginTop: 16 }}
            >
              No upcoming tasks
            </Typography>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingTop: 0, // Header provides the top spacing
    paddingBottom: 150,
  },

  section: {
    marginBottom: theme.spacing.xl,
  },
  dateLabel: {
    marginBottom: theme.spacing.sm,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  itemsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    padding: theme.spacing.md,
  },
  timeColumn: {
    width: 70,
  },
  itemContent: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 86,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  deleteButton: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarButton: {
    padding: theme.spacing.xs,
  },
});
