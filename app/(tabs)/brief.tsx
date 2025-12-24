import { View, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Check } from 'lucide-react-native';
import { theme } from '../../src/ui/theme';
import { Typography } from '../../src/ui/components/Typography';
import { Card } from '../../src/ui/components/Card';
import { useItemsStore } from '../../src/store/useItemsStore';
import { Item } from '../../src/db/items';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function BriefScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { items, init, markAsDone, updateItem } = useItemsStore();
  
  useEffect(() => {
    init();
  }, []);

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
  const upcomingItems = items
    .filter(i => {
      if (i.status !== 'active') return false;
      const effectiveDate = getEffectiveDate(i);
      if (!effectiveDate) return false;
      const date = new Date(effectiveDate);
      return date > now && date.toDateString() !== now.toDateString();
    })
    .sort((a, b) => {
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

  const TaskRow = ({ item }: { item: Item }) => {
    const effectiveDate = getEffectiveDate(item);
    const time = effectiveDate
      ? new Date(effectiveDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';
    const isDone = item.status === 'done';
      
    return (
      <View style={styles.taskRow}>
        {/* Checkbox - only toggles completion */}
        <TouchableOpacity 
          onPress={() => handleToggleItem(item)}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={[
            styles.checkbox, 
            { borderColor: isDone ? colors.success : colors.textTertiary },
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
        </TouchableOpacity>
        
        {time ? (
          <TouchableOpacity 
            onPress={() => handleEditItem(item)}
            activeOpacity={0.6}
          >
            <Typography 
              variant="caption2" 
              color={colors.textSecondary}
              style={isDone ? { opacity: 0.5 } : undefined}
            >
              {time}
            </Typography>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
      pointerEvents="box-none"
    >
      <View style={styles.content}>
        {/* Daily Brief Card */}
        <Card style={[styles.briefCard, { flex: 1 }]}>
          <View style={[styles.briefHeader, { backgroundColor: colors.card, zIndex: 10 }]}>
            <View style={styles.briefTitleContainer}>
              <Image 
                source={require('../../assets/AI_Companion_icon.png')}
                style={styles.headerIcon}
                resizeMode="contain"
              />
              <Typography variant="title1">Daily Brief</Typography>
            </View>
            <TouchableOpacity 
              onPress={() => router.push('/voice')}
              activeOpacity={0.6}
            >
              <Sparkles size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 150 }}
            style={{ zIndex: 1 }}
          >
            {/* Today Section */}
            <View style={styles.section}>
              <Typography variant="headline" style={styles.sectionTitle}>
                Today
              </Typography>
              {todayItems.map((item) => (
                <TaskRow key={item.id} item={item} />
              ))}
              {todayItems.length === 0 && (
                <Typography variant="body" color={colors.textSecondary} style={{ paddingVertical: 8 }}>
                   No tasks for today.
                </Typography>
              )}
            </View>

            {/* Coming Up Section */}
            {upcomingItems.length > 0 && (
              <View style={styles.section}>
                <Typography variant="headline" style={styles.sectionTitle}>
                  Soon
                </Typography>
                {upcomingItems.map((item) => (
                  <TaskRow key={item.id} item={item} />
                ))}
              </View>
            )}
            
            {/* Additional Mock Content to enable scrolling demonstration if needed */}
            <Typography variant="footnote" color={colors.textTertiary} style={{ marginTop: 20, textAlign: 'center' }}>
              That's all for now.
            </Typography>
          </ScrollView>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1, // fill the screen
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: 120,
  },

  // Brief Card Styles
  briefCard: {
    padding: theme.spacing.lg,
    paddingBottom: 0, // Remove bottom padding from card implementation to allow scrollview to handle it
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden', // Ensure content clips to rounded corners
  },
  briefHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
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
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
});
