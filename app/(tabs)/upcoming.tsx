import { View, ScrollView, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { theme } from '../../src/ui/theme';
import { Typography } from '../../src/ui/components/Typography';
import { Card } from '../../src/ui/components/Card';
import { useItemsStore } from '../../src/store/useItemsStore';
import { Item } from '../../src/db/items';
import { Calendar, Trash2 } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';

export default function UpcomingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { items, init, deleteItem } = useItemsStore();

  useEffect(() => {
    init();
  }, []);

  const now = new Date();

  // Helper to get the effective date (dueAt or remindAt)
  const getEffectiveDate = (item: Item): string | null => {
    return item.dueAt || item.remindAt || null;
  };

  const upcoming = items
    .filter(i => {
      if (i.status !== 'active') return false;
      const effectiveDate = getEffectiveDate(i);
      if (!effectiveDate) return false;
      return new Date(effectiveDate) > now;
    })
    .sort((a, b) => new Date(getEffectiveDate(a)!).getTime() - new Date(getEffectiveDate(b)!).getTime());

  // Items without any date (excluding notes)
  const unscheduled = items.filter(i => i.status === 'active' && !getEffectiveDate(i) && i.type !== 'note');

  // Group by date
  const grouped: { [key: string]: Item[] } = {};
  upcoming.forEach(item => {
    const date = new Date(getEffectiveDate(item)!);
    const key = date.toLocaleDateString('en-US', { 
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
    
    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={(progress) => renderRightActions(item.id, progress)}
        rightThreshold={40}
        overshootRight={false}
      >
        <TouchableOpacity 
          style={[styles.itemRow, { backgroundColor: colors.card }]}
          onPress={() => handleEditItem(item)}
          activeOpacity={0.7}
        >
          <View style={styles.timeColumn}>
            {showTime && getEffectiveDate(item) ? (
              <Typography variant="headline">
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
              color={colors.textSecondary}
            >
              {item.type}
            </Typography>
          </View>
        </TouchableOpacity>
      </Swipeable>
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
            <Typography variant="largeTitle">Upcoming</Typography>
          </View>
        </View>

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
