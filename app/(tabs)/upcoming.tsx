import { View, ScrollView, StyleSheet, Image, TouchableOpacity, Animated, AppState, AppStateStatus } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { theme } from '../../src/ui/theme';
import { Typography } from '../../src/ui/components/Typography';
import { Card } from '../../src/ui/components/Card';
import { useItemsStore } from '../../src/store/useItemsStore';
import { Item } from '../../src/db/items';
import { Calendar, Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { GlassyHeader } from '../../src/ui/components/GlassyHeader';

export default function UpcomingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, init, loadItems, deleteItem } = useItemsStore();

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
  
  // Calculate 7 days from now
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  sevenDaysFromNow.setHours(23, 59, 59, 999);

  // Helper to get the effective date (dueAt or remindAt)
  const getEffectiveDate = (item: Item): string | null => {
    return item.dueAt || item.remindAt || null;
  };

  // Interface for display items (can have virtual dates for repeating tasks)
  interface DisplayItem extends Item {
    displayDate: Date;
  }

  // Expand repeating tasks into multiple occurrences for the next 7 days
  const expandedItems: DisplayItem[] = [];
  
  items.forEach(item => {
    if (item.status !== 'active') return;
    
    const effectiveDate = getEffectiveDate(item);
    
    // Daily repeat: add an entry for each of the next 7 days
    if (item.repeat === 'daily') {
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const displayDate = new Date(now);
        displayDate.setDate(displayDate.getDate() + dayOffset);
        
        // If item has a time, use that time, otherwise use current time
        if (effectiveDate) {
          const originalDate = new Date(effectiveDate);
          displayDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
        }
        
        // Skip if this occurrence is in the past today
        if (dayOffset === 0 && displayDate <= now) continue;
        
        expandedItems.push({ ...item, displayDate });
      }
      return;
    }
    
    // Weekly repeat: add entries for each week within 7 days (so just once or twice)
    if (item.repeat === 'weekly' && effectiveDate) {
      const baseDate = new Date(effectiveDate);
      for (let weekOffset = 0; weekOffset <= 1; weekOffset++) {
        const displayDate = new Date(baseDate);
        displayDate.setDate(displayDate.getDate() + (weekOffset * 7));
        
        if (displayDate > now && displayDate <= sevenDaysFromNow) {
          expandedItems.push({ ...item, displayDate });
        }
      }
      return;
    }
    
    // Non-repeating or other repeat types: just add if within range
    if (effectiveDate) {
      const itemDate = new Date(effectiveDate);
      if (itemDate > now && itemDate <= sevenDaysFromNow) {
        expandedItems.push({ ...item, displayDate: itemDate });
      }
    } else if (item.repeat && item.repeat !== 'none') {
      // Repeating task without date - show as today
      expandedItems.push({ ...item, displayDate: now });
    }
  });

  // Sort by display date
  const upcoming = expandedItems.sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime());

  // Items without any date (excluding notes and repeating tasks since they show above)
  const unscheduled = items.filter(i => 
    i.status === 'active' && 
    !getEffectiveDate(i) && 
    i.type !== 'note' &&
    (!i.repeat || i.repeat === 'none')
  );

  // Group by date
  const grouped: { [key: string]: DisplayItem[] } = {};
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

  const handleDeleteItem = async (id: string) => {
    await deleteItem(id);
  };

  const renderRightActions = (itemId: string, progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });
    
    return (
      <Animated.View style={[styles.deleteAction, { transform: [{ translateX }] }]}>
        <TouchableOpacity 
          style={[styles.deleteButton, { backgroundColor: colors.danger }]}
          onPress={() => handleDeleteItem(itemId)}
        >
          <Trash2 size={22} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const ItemRow = ({ item, showTime = true }: { item: Item; showTime?: boolean }) => {
    const swipeableRef = useRef<Swipeable>(null);
    
    // Check if this task has an overdue reminder (reminder time passed but not done)
    const isOverdueReminder = item.status === 'active' && item.remindAt && new Date(item.remindAt) <= now;
    
    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={(progress) => renderRightActions(item.id, progress)}
        rightThreshold={40}
        overshootRight={false}
      >
        <TouchableOpacity 
          style={[
            styles.itemRow, 
            { backgroundColor: colors.card },
            // Highlight overdue reminders
            isOverdueReminder && {
              borderLeftWidth: 4,
              borderLeftColor: colors.warning,
              backgroundColor: `${colors.warning}10`,
            }
          ]}
          onPress={() => handleEditItem(item)}
          activeOpacity={0.7}
        >
          <View style={styles.timeColumn}>
            {showTime && getEffectiveDate(item) ? (
              <Typography variant="headline" color={isOverdueReminder ? colors.warning : colors.text}>
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
            <Typography variant="body">{item.title}</Typography>
            <Typography 
              variant="caption1" 
              color={isOverdueReminder ? colors.warning : colors.textSecondary}
            >
              {isOverdueReminder ? '⏰ Reminder overdue' : item.type}
            </Typography>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlassyHeader title="Upcoming" />

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
                  <ItemRow item={item} />
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
});
