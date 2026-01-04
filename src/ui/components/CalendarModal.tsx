import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { Calendar, DateData } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from './Typography';
import { Card } from './Card';
import { theme, hexToRgba } from '../theme';
import { Item } from '../../db/items';
import { expandRepeatingItems, ExpandedItem, getEffectiveDate } from '../../utils/repeatExpansion';
import { formatLocalDate } from '../../utils/dateUtils';
import { X } from 'lucide-react-native';
import { useResponsive } from '../useResponsive';

interface CalendarModalProps {
  isVisible: boolean;
  onClose: () => void;
  items: Item[];
  onItemPress: (item: Item) => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isVisible,
  onClose,
  items,
  onItemPress,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktop, wideModalWidth } = useResponsive();
  const [selectedDate, setSelectedDate] = useState<string>(
    formatLocalDate(new Date())
  );

  // Expand repeating items for the next 365 days (full year forecast)
  const expandedItems = useMemo(
    () => expandRepeatingItems(items, 365, false),
    [items]
  );

  // Create marked dates object for calendar
  const markedDates = useMemo(() => {
    const marked: { [key: string]: any } = {};

    // Mark dates with tasks
    expandedItems.forEach((item) => {
      const dateKey = formatLocalDate(item.displayDate);
      if (!marked[dateKey]) {
        marked[dateKey] = {
          marked: true,
          dots: [],
        };
      }
      
      // Add dot for this task (you can customize colors based on priority/type)
      const dotColor = item.isCompleted 
        ? colors.textTertiary 
        : colors.primary;
      
      if (!marked[dateKey].dots.some((d: any) => d.color === dotColor)) {
        marked[dateKey].dots.push({ color: dotColor });
      }
    });

    // Mark selected date
    if (marked[selectedDate]) {
      marked[selectedDate].selected = true;
      marked[selectedDate].selectedColor = colors.primary;
    } else {
      marked[selectedDate] = {
        selected: true,
        selectedColor: colors.primary,
      };
    }

    return marked;
  }, [expandedItems, selectedDate, colors]);

  // Filter tasks for selected date
  const tasksForSelectedDate = useMemo(() => {
    return expandedItems.filter((item) => {
      const itemDate = formatLocalDate(item.displayDate);
      return itemDate === selectedDate;
    }).sort((a, b) => {
      // Completed items go to end
      if (a.isCompleted && !b.isCompleted) return 1;
      if (!a.isCompleted && b.isCompleted) return -1;
      // Sort by time
      return a.displayDate.getTime() - b.displayDate.getTime();
    });
  }, [expandedItems, selectedDate]);

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const TaskItem = ({ item }: { item: ExpandedItem }) => {
    const isCompleted = item.isCompleted || item.status === 'done';
    const effectiveDate = getEffectiveDate(item);

    return (
      <TouchableOpacity
        style={[styles.taskItem, { backgroundColor: colors.background }]}
        onPress={() => onItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.taskTime}>
          {effectiveDate ? (
            <Typography
              variant="caption1"
              color={isCompleted ? colors.textTertiary : colors.textSecondary}
              style={isCompleted ? { textDecorationLine: 'line-through' } : undefined}
            >
              {new Date(effectiveDate).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Typography>
          ) : (
            <Typography variant="caption1" color={colors.textTertiary}>
              —
            </Typography>
          )}
        </View>
        <View style={styles.taskContent}>
          <Typography
            variant="body"
            style={isCompleted ? { textDecorationLine: 'line-through', opacity: 0.5 } : undefined}
          >
            {item.title}
          </Typography>
          <Typography variant="caption1" color={colors.textSecondary}>
            {isCompleted ? '✓ Completed' : item.type}
          </Typography>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={[
        styles.modal,
        isDesktop && styles.modalDesktop
      ]}
      backdropOpacity={0.7}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={300}
      animationOutTiming={300}
      propagateSwipe
    >
      <View style={[
        styles.modalContent,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
        },
        isDesktop && {
          width: wideModalWidth,
          maxWidth: 800,
          alignSelf: 'center',
          height: '90%',
          borderRadius: 24,
        }
      ]}>
        {/* Handle bar */}
        <View style={styles.handleBar}>
          <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Typography variant="title1">Calendar</Typography>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Calendar */}
          <Calendar
            current={selectedDate}
            onDayPress={handleDayPress}
            markedDates={markedDates}
            markingType="multi-dot"
            theme={{
              backgroundColor: colors.card,
              calendarBackground: colors.card,
              textSectionTitleColor: colors.textSecondary,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: '#ffffff',
              todayTextColor: colors.primary,
              dayTextColor: colors.text,
              textDisabledColor: colors.textTertiary,
              dotColor: colors.primary,
              selectedDotColor: '#ffffff',
              arrowColor: colors.primary,
              monthTextColor: colors.text,
              indicatorColor: colors.primary,
              textDayFontFamily: theme.typography.body.fontFamily,
              textMonthFontFamily: theme.typography.title2.fontFamily,
              textDayHeaderFontFamily: theme.typography.body.fontFamily,
              textDayFontSize: 15,
              textMonthFontSize: 17,
              textDayHeaderFontSize: 13,
            }}
            style={[styles.calendar, { backgroundColor: colors.card }]}
          />

          {/* Tasks for selected date */}
          <View style={styles.tasksSection}>
            <Typography
              variant="footnote"
              color={colors.textSecondary}
              style={styles.tasksSectionTitle}
            >
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              }).toUpperCase()}
            </Typography>

            {tasksForSelectedDate.length > 0 ? (
              <Card style={styles.tasksCard}>
                {tasksForSelectedDate.map((item, index) => (
                  <View key={`${item.id}-${item.displayDate.getTime()}`}>
                    <TaskItem item={item} />
                    {index < tasksForSelectedDate.length - 1 && (
                      <View style={[styles.separator, { backgroundColor: colors.separator }]} />
                    )}
                  </View>
                ))}
              </Card>
            ) : (
              <View style={styles.emptyState}>
                <Typography variant="callout" color={colors.textSecondary}>
                  No tasks for this day
                </Typography>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    height: '100%',
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  calendar: {
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  tasksSection: {
    paddingHorizontal: theme.spacing.lg,
  },
  tasksSectionTitle: {
    marginBottom: theme.spacing.sm,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  tasksCard: {
    padding: 0,
    overflow: 'hidden',
  },
  taskItem: {
    flexDirection: 'row',
    padding: theme.spacing.md,
  },
  taskTime: {
    width: 70,
  },
  taskContent: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 86,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
});
