import { View, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles } from 'lucide-react-native';
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
  const { items, init, markAsDone } = useItemsStore();
  
  useEffect(() => {
    init();
  }, []);

  const now = new Date();
  
  const todayItems = items.filter(i => {
    if (i.status !== 'active' || !i.dueAt) return false;
    return new Date(i.dueAt).toDateString() === now.toDateString();
  });
  
  const upcomingItems = items.filter(i => {
    if (i.status !== 'active' || !i.dueAt) return false;
    const dueDate = new Date(i.dueAt);
    return dueDate > now && dueDate.toDateString() !== now.toDateString();
  }).slice(0, 4);

  const TaskRow = ({ item }: { item: Item }) => {
    const time = item.dueAt 
      ? new Date(item.dueAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';
      
    return (
      <TouchableOpacity 
        style={styles.taskRow}
        onPress={() => markAsDone(item.id)}
        activeOpacity={0.6}
      >
        <View style={[styles.checkbox, { borderColor: colors.textTertiary }]}>
          <View style={styles.checkboxInner} />
        </View>
        <View style={styles.taskContent}>
          <Typography variant="body">{item.title}</Typography>
        </View>
        {time ? (
          <Typography variant="caption2" color={colors.textSecondary}>
            {time}
          </Typography>
        ) : null}
      </TouchableOpacity>
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
          <View style={styles.briefHeader}>
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
