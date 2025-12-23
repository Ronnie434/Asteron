import { View, ScrollView, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../src/ui/theme';
import { Typography } from '../../src/ui/components/Typography';
import { Card } from '../../src/ui/components/Card';
import { useItemsStore } from '../../src/store/useItemsStore';
import { Item } from '../../src/db/items';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function UpcomingScreen() {
  const { colors } = useTheme();
  const { items, init } = useItemsStore();

  useEffect(() => {
    init();
  }, []);

  const now = new Date();

  const upcoming = items
    .filter(i => {
      if (i.status !== 'active' || !i.dueAt) return false;
      return new Date(i.dueAt) > now;
    })
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime());

  // Group by date
  const grouped: { [key: string]: Item[] } = {};
  upcoming.forEach(item => {
    const date = new Date(item.dueAt!);
    const key = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

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
            <Card>
              {dateItems.map((item, index) => (
                <View key={item.id}>
                  <View style={styles.itemRow}>
                    <View style={styles.timeColumn}>
                      <Typography variant="headline">
                        {new Date(item.dueAt!).toLocaleTimeString([], { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </Typography>
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
                  </View>
                  {index < dateItems.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: colors.separator }]} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        ))}

        {upcoming.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons 
              name="calendar-outline" 
              size={48} 
              color={colors.textTertiary} 
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
});
