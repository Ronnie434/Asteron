import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { safeParseDate } from '../utils/dateUtils';

// Configure how notifications behave when the app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Generate time-based notification title
 * Creates precise, context-first copy based on remindAt ↔ dueAt relationship
 */
const getNotificationTitle = (remindAt: Date, dueAt: Date | null, title: string): string => {
    // No due date = pure reminder
    if (!dueAt) {
        return `Reminder: ${title}`;
    }

    const diffMs = dueAt.getTime() - remindAt.getTime();
    const diffMin = Math.round(diffMs / 60000);

    // Overdue: reminder fires after due date
    if (diffMs < 0) {
        return `Overdue: ${title}`;
    }

    // Due now: within 5 minutes
    if (diffMin <= 5) {
        return `Due now: ${title}`;
    }

    // Due in X min: within 1 hour
    if (diffMin <= 60) {
        return `Due in ${diffMin} min: ${title}`;
    }

    // Check if same day
    const isSameDay = remindAt.toDateString() === dueAt.toDateString();
    if (isSameDay) {
        const timeStr = dueAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return `Due at ${timeStr}: ${title}`;
    }

    // Check if tomorrow
    const tomorrow = new Date(remindAt);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = tomorrow.toDateString() === dueAt.toDateString();
    if (isTomorrow) {
        const timeStr = dueAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return `Due tomorrow at ${timeStr}: ${title}`;
    }

    // Further out - show day name
    const dayName = dueAt.toLocaleDateString([], { weekday: 'short' });
    const timeStr = dueAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `Due ${dayName} at ${timeStr}: ${title}`;
};

export const NotificationService = {
    /**
     * Request notification permissions from the user
     * @returns true if permissions were granted
     */
    requestPermissions: async (): Promise<boolean> => {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.warn('Notification permissions not granted');
                return false;
            }

            // Set up Android notification channel
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('reminders', {
                    name: 'Reminders',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF6B35',
                    sound: 'default',
                });
            }

            return true;
        } catch (e) {
            console.error('Failed to request notification permissions:', e);
            return false;
        }
    },

    /**
     * Schedule a notification reminder for a specific item
     * @param id - Unique identifier for the notification (item ID)
     * @param title - Task/item title
     * @param remindAtStr - ISO 8601 date string for when to trigger the notification
     * @param dueAtStr - Optional ISO 8601 date string for when the item is actually due
     */
    scheduleReminder: async (
        id: string,
        title: string,
        remindAtStr: string,
        dueAtStr?: string | null
    ): Promise<void> => {
        try {
            const remindAt = safeParseDate(remindAtStr);
            const dueAt = dueAtStr ? safeParseDate(dueAtStr) : null;
            const now = new Date();

            // Check for Quiet Hours
            const { quietHoursEnabled, quietHoursStart, quietHoursEnd } = useSettingsStore.getState();

            if (quietHoursEnabled) {
                const [startHour, startMinute] = quietHoursStart.split(':').map(Number);
                const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);

                const notifHour = remindAt.getHours();
                const notifMinute = remindAt.getMinutes();
                const notifTime = notifHour * 60 + notifMinute;

                const startTime = startHour * 60 + startMinute;
                const endTime = endHour * 60 + endMinute;

                let inQuietHours = false;
                if (startTime < endTime) {
                    // Window is within the same day, e.g. 01:00 - 05:00
                    if (notifTime >= startTime && notifTime < endTime) {
                        inQuietHours = true;
                    }
                } else {
                    // Window crosses midnight, e.g. 22:00 - 07:00
                    if (notifTime >= startTime || notifTime < endTime) {
                        inQuietHours = true;
                    }
                }

                if (inQuietHours) {
                    // console.log(`Notification time ${remindAt.toLocaleTimeString()} falls in Quiet Hours (${quietHoursStart}-${quietHoursEnd})`);

                    // Reschedule to end of quiet hours
                    const newRemindAt = new Date(remindAt);
                    newRemindAt.setHours(endHour, endMinute, 0, 0);

                    // If we are in the late night portion (after start time), we need to move to tomorrow
                    if (startTime > endTime && notifTime >= startTime) {
                        newRemindAt.setDate(newRemindAt.getDate() + 1);
                    }

                    // console.log(`Rescheduling to ${newRemindAt.toLocaleString()}`);
                    await NotificationService.scheduleReminder(
                        id,
                        title,
                        newRemindAt.toISOString(),
                        dueAtStr
                    );
                    return; // Exit this call
                }
            }

            // Don't schedule in the past
            if (remindAt.getTime() <= now.getTime()) {
                // console.log(`Skipping notification for ${id} - time is in the past`);
                return;
            }

            // Cancel any existing notification for this item to avoid duplicates
            await Notifications.cancelScheduledNotificationAsync(id).catch(() => { });

            // Generate time-based notification title
            const notificationTitle = getNotificationTitle(remindAt, dueAt, title);

            await Notifications.scheduleNotificationAsync({
                identifier: id,
                content: {
                    title: notificationTitle,
                    body: '', // Clean notifications - just the title
                    sound: 'default',
                    badge: 1,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    data: { itemId: id },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: remindAt,
                    channelId: Platform.OS === 'android' ? 'reminders' : undefined,
                },
            });

            // console.log(`Scheduled notification "${notificationTitle}" at ${remindAt.toLocaleString()}`);
        } catch (e) {
            console.error("Failed to schedule notification:", e);
        }
    },

    /**
     * Cancel a scheduled notification
     * @param id - The notification identifier to cancel
     */
    cancelReminder: async (id: string): Promise<void> => {
        try {
            await Notifications.cancelScheduledNotificationAsync(id);
            // console.log(`Cancelled notification ${id}`);
        } catch (e) {
            console.error("Failed to cancel notification:", e);
        }
    },

    /**
     * Cancel ALL notifications for an item (comprehensive cleanup)
     * Uses the system's notification list to ensure no orphaned notifications remain
     * @param itemId - The item ID to cancel all notifications for
     */
    cancelAllNotificationsForItem: async (itemId: string): Promise<void> => {
        try {
            const allNotifications = await Notifications.getAllScheduledNotificationsAsync();

            // Find all notifications that belong to this item
            // They either match the exact ID or start with itemId_ (occurrence format)
            const matchingNotifications = allNotifications.filter(
                (n) => n.identifier === itemId || n.identifier.startsWith(`${itemId}_`)
            );

            // Cancel all matching notifications
            for (const notification of matchingNotifications) {
                await Notifications.cancelScheduledNotificationAsync(notification.identifier).catch(() => { });
            }

            // console.log(`Cancelled ${matchingNotifications.length} notification(s) for item ${itemId}`);
        } catch (e) {
            console.error("Failed to cancel notifications for item:", e);
        }
    },

    /**
     * Generate a notification ID for a specific occurrence
     * Format: itemId_YYYY-MM-DD (using local date to avoid timezone issues)
     */
    getOccurrenceNotificationId: (itemId: string, occurrenceDate: Date): string => {
        // Use local date to avoid timezone issues (toISOString converts to UTC)
        const year = occurrenceDate.getFullYear();
        const month = String(occurrenceDate.getMonth() + 1).padStart(2, '0');
        const day = String(occurrenceDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        return `${itemId}_${dateStr}`;
    },

    /**
     * Schedule a notification for a specific occurrence of a repeating item
     * @param itemId - The item ID
     * @param title - Task title
     * @param reminderTime - When to fire the notification
     * @param dueTime - Optional due time for this occurrence
     */
    scheduleOccurrenceReminder: async (
        itemId: string,
        title: string,
        reminderTime: Date,
        dueTime?: Date | null
    ): Promise<void> => {
        const notificationId = NotificationService.getOccurrenceNotificationId(itemId, reminderTime);

        // Use the existing scheduleReminder with the occurrence-specific ID
        await NotificationService.scheduleReminder(
            notificationId,
            title,
            reminderTime.toISOString(),
            dueTime ? dueTime.toISOString() : null
        );
    },

    /**
     * Cancel a specific occurrence's notification
     */
    cancelOccurrenceReminder: async (itemId: string, occurrenceDate: Date): Promise<void> => {
        const notificationId = NotificationService.getOccurrenceNotificationId(itemId, occurrenceDate);
        await NotificationService.cancelReminder(notificationId);
    },

    /**
     * Schedule notifications for all upcoming occurrences of a repeating item
     * @param item - The item with repeat settings
     * @param daysAhead - Number of days to schedule ahead (default 7)
     */
    scheduleAllOccurrences: async (
        item: { id: string; title: string; remindAt?: string | null; dueAt?: string | null; repeat?: string | null; skippedDates?: string | null; completedDates?: string | null },
        daysAhead: number = 7
    ): Promise<void> => {
        if (!item.remindAt || !item.repeat || item.repeat === 'none') {
            return;
        }

        const baseRemindAt = safeParseDate(item.remindAt);
        const baseDueAt = item.dueAt ? safeParseDate(item.dueAt) : null;
        const now = new Date();

        // Parse skipped and completed dates to avoid scheduling notifications for them
        const skippedDates: string[] = item.skippedDates
            ? JSON.parse(item.skippedDates)
            : [];
        const completedDates: string[] = item.completedDates
            ? JSON.parse(item.completedDates)
            : [];

        // console.log(`Scheduling ${daysAhead} days of notifications for "${item.title}"`);

        if (item.repeat === 'daily') {
            for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
                const occurrenceRemindAt = new Date(now);
                occurrenceRemindAt.setDate(occurrenceRemindAt.getDate() + dayOffset);
                occurrenceRemindAt.setHours(baseRemindAt.getHours(), baseRemindAt.getMinutes(), 0, 0);

                // Compute occurrence dueAt if base dueAt exists
                let occurrenceDueAt: Date | null = null;
                if (baseDueAt) {
                    occurrenceDueAt = new Date(occurrenceRemindAt);
                    occurrenceDueAt.setHours(baseDueAt.getHours(), baseDueAt.getMinutes(), 0, 0);
                }

                // Check if this date is skipped or completed (use local date to match stored format)
                const year = occurrenceRemindAt.getFullYear();
                const month = String(occurrenceRemindAt.getMonth() + 1).padStart(2, '0');
                const day = String(occurrenceRemindAt.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                if (skippedDates.includes(dateStr)) {
                    // console.log(`Skipping notification for "${item.title}" on ${dateStr} (skipped)`);
                    continue;
                }

                if (completedDates.includes(dateStr)) {
                    // console.log(`Skipping notification for "${item.title}" on ${dateStr} (completed)`);
                    continue;
                }

                // Only schedule if in the future
                if (occurrenceRemindAt > now) {
                    await NotificationService.scheduleOccurrenceReminder(
                        item.id,
                        item.title,
                        occurrenceRemindAt,
                        occurrenceDueAt
                    );
                }
            }
        } else if (item.repeat === 'weekly') {
            // Schedule next 2 weekly occurrences within daysAhead
            for (let weekOffset = 0; weekOffset <= Math.ceil(daysAhead / 7); weekOffset++) {
                const occurrenceRemindAt = new Date(baseRemindAt);
                occurrenceRemindAt.setDate(occurrenceRemindAt.getDate() + (weekOffset * 7));

                // Compute occurrence dueAt if base dueAt exists
                let occurrenceDueAt: Date | null = null;
                if (baseDueAt) {
                    occurrenceDueAt = new Date(occurrenceRemindAt);
                    occurrenceDueAt.setHours(baseDueAt.getHours(), baseDueAt.getMinutes(), 0, 0);
                }

                if (occurrenceRemindAt > now) {
                    await NotificationService.scheduleOccurrenceReminder(
                        item.id,
                        item.title,
                        occurrenceRemindAt,
                        occurrenceDueAt
                    );
                }
            }
        } else if (item.repeat === 'monthly') {
            // Schedule next month's occurrence if within daysAhead
            const nextMonthRemindAt = new Date(baseRemindAt);
            nextMonthRemindAt.setMonth(nextMonthRemindAt.getMonth() + 1);

            // Compute occurrence dueAt if base dueAt exists
            // IMPORTANT: Increment the month for dueAt as well!
            let nextMonthDueAt: Date | null = null;
            if (baseDueAt) {
                nextMonthDueAt = new Date(baseDueAt);
                nextMonthDueAt.setMonth(nextMonthDueAt.getMonth() + 1);
            }

            if (nextMonthRemindAt > now) {
                await NotificationService.scheduleOccurrenceReminder(
                    item.id,
                    item.title,
                    nextMonthRemindAt,
                    nextMonthDueAt
                );
            }
        }
    },

    /**
     * Cancel all occurrence notifications for an item
     * @param itemId - The item ID
     * @param daysAhead - Number of days to cancel ahead (default 14)
     */
    cancelAllOccurrences: async (itemId: string, daysAhead: number = 14): Promise<void> => {
        const now = new Date();

        for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
            const occurrenceDate = new Date(now);
            occurrenceDate.setDate(occurrenceDate.getDate() + dayOffset);

            const notificationId = NotificationService.getOccurrenceNotificationId(itemId, occurrenceDate);
            await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => { });
        }

        // console.log(`Cancelled all occurrence notifications for item ${itemId}`);
    },

    /**
     * Extend notifications for a repeating item by scheduling one more day
     * Called when a notification fires to keep the rolling window going
     * @param item - The item to extend notifications for
     * @param daysFromNow - How many days from today to schedule (default 7)
     */
    extendNextOccurrence: async (
        item: { id: string; title: string; remindAt?: string | null; dueAt?: string | null; repeat?: string | null },
        daysFromNow: number = 7
    ): Promise<void> => {
        if (!item.remindAt || !item.repeat || item.repeat === 'none') {
            return;
        }

        const baseRemindAt = safeParseDate(item.remindAt);
        const baseDueAt = item.dueAt ? safeParseDate(item.dueAt) : null;
        const now = new Date();

        // Calculate the target reminder date (7 days from now)
        const targetRemindAt = new Date(now);
        targetRemindAt.setDate(targetRemindAt.getDate() + daysFromNow);
        targetRemindAt.setHours(baseRemindAt.getHours(), baseRemindAt.getMinutes(), 0, 0);

        // Compute target dueAt if base dueAt exists
        let targetDueAt: Date | null = null;
        if (baseDueAt) {
            targetDueAt = new Date(targetRemindAt);
            targetDueAt.setHours(baseDueAt.getHours(), baseDueAt.getMinutes(), 0, 0);
        }

        // Schedule based on repeat type
        if (item.repeat === 'daily') {
            await NotificationService.scheduleOccurrenceReminder(
                item.id,
                item.title,
                targetRemindAt,
                targetDueAt
            );
            // console.log(`Extended notification for "${item.title}" to ${targetRemindAt.toLocaleString()}`);
        } else if (item.repeat === 'weekly') {
            // For weekly, check if targetDate falls on the same day of week as the original
            const originalDayOfWeek = baseRemindAt.getDay();
            if (targetRemindAt.getDay() === originalDayOfWeek) {
                await NotificationService.scheduleOccurrenceReminder(
                    item.id,
                    item.title,
                    targetRemindAt,
                    targetDueAt
                );
            }
        }
        // Monthly/yearly don't need daily extension
    },

    /**
     * Cancel all scheduled notifications
     */
    cancelAllReminders: async (): Promise<void> => {
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
            // console.log('Cancelled all notifications');
        } catch (e) {
            console.error("Failed to cancel all notifications:", e);
        }
    },

    // Badge management

    /**
     * Get the current app badge count
     */
    getBadgeCount: async (): Promise<number> => {
        try {
            return await Notifications.getBadgeCountAsync();
        } catch (e) {
            console.error("Failed to get badge count:", e);
            return 0;
        }
    },

    /**
     * Set the app badge count
     * @param count - The badge count to set
     */
    setBadgeCount: async (count: number): Promise<void> => {
        try {
            await Notifications.setBadgeCountAsync(count);
        } catch (e) {
            console.error("Failed to set badge count:", e);
        }
    },

    /**
     * Increment the badge count by 1
     */
    incrementBadge: async (): Promise<void> => {
        try {
            const current = await Notifications.getBadgeCountAsync();
            await Notifications.setBadgeCountAsync(current + 1);
        } catch (e) {
            console.error("Failed to increment badge:", e);
        }
    },

    /**
     * Clear the app badge (set to 0)
     */
    clearBadge: async (): Promise<void> => {
        try {
            await Notifications.setBadgeCountAsync(0);
        } catch (e) {
            console.error("Failed to clear badge:", e);
        }
    },

    /**
     * Get all scheduled notifications (useful for debugging)
     */
    getScheduledNotifications: async () => {
        try {
            return await Notifications.getAllScheduledNotificationsAsync();
        } catch (e) {
            console.error("Failed to get scheduled notifications:", e);
            return [];
        }
    },
};
