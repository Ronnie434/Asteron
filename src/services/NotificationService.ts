import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';

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
     * @param title - Notification title
     * @param body - Notification body text  
     * @param dateStr - ISO 8601 date string for when to trigger
     * @param priority - Item priority level for styling
     */
    scheduleReminder: async (
        id: string,
        title: string,
        body: string,
        dateStr: string,
        priority: 'high' | 'med' | 'low' = 'med'
    ): Promise<void> => {
        try {
            const date = new Date(dateStr);
            const now = new Date();

            // Check for Quiet Hours
            const { quietHoursEnabled, quietHoursStart, quietHoursEnd } = useSettingsStore.getState();

            if (quietHoursEnabled) {
                const [startHour, startMinute] = quietHoursStart.split(':').map(Number);
                const [endHour, endMinute] = quietHoursEnd.split(':').map(Number);

                const notifHour = date.getHours();
                const notifMinute = date.getMinutes();
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
                    console.log(`Notification time ${date.toLocaleTimeString()} falls in Quiet Hours (${quietHoursStart}-${quietHoursEnd})`);

                    // Reschedule to end of quiet hours
                    // If current time is before end time (early morning), set to today's end time
                    // If current time is after start time (late night), set to tomorrow's end time

                    const newDate = new Date(date);
                    newDate.setHours(endHour, endMinute, 0, 0);

                    // If we are in the late night portion (after start time), we need to move to tomorrow
                    // unless start time is < end time (unlikely for overnight quiet hours but possible logic-wise)
                    if (startTime > endTime && notifTime >= startTime) {
                        newDate.setDate(newDate.getDate() + 1);
                    }

                    // Add a small buffer (e.g. 1 minute) to ensure it doesn't trigger immediately if we are at the edge? 
                    // No, end time is fine. Maybe add "Quiet Hours ended:" prefix?
                    // Let's just reschedule.

                    console.log(`Rescheduling to ${newDate.toLocaleString()}`);
                    // recursive call with new date? Or just modify `date`?
                    // Modifying `date` is cleaner but `date` is const `new Date(dateStr)`. 
                    // I should update `date` variable. But I declared it const. 
                    // I will perform the check effectively by recursively calling scheduleReminder with the new date string
                    // BUT I need to preserve the ID.

                    // Actually, I can just update the `date` object if I change it to `let` or create a new variable to use in scheduleNotificationAsync.
                    // Let's change the downstream code to use `finalDate`.

                    // Or simpler:
                    await NotificationService.scheduleReminder(
                        id,
                        title,
                        body,
                        newDate.toISOString(),
                        priority
                    );
                    return; // Exit this call
                }
            }

            // Don't schedule in the past
            if (date.getTime() <= now.getTime()) {
                console.log(`Skipping notification for ${id} - time is in the past`);
                return;
            }

            // Cancel any existing notification for this item to avoid duplicates
            await Notifications.cancelScheduledNotificationAsync(id).catch(() => { });

            // Priority-based styling
            const priorityConfig = {
                high: { titlePrefix: '🔥 Due soon:', subtitle: '' }, // subtitle built dynamically with dueAt
                med: { titlePrefix: '⏰ Due today:', subtitle: 'Tap to finish' },
                low: { titlePrefix: '✍️ Reminder:', subtitle: 'When you have time' },
            };

            const config = priorityConfig[priority] || priorityConfig.med;
            const notificationTitle = `${config.titlePrefix} ${title}`;

            // For high priority, include the due time in the body
            let notificationBody: string;
            if (priority === 'high') {
                const dueTime = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                notificationBody = body && body !== title ? body : `Due at ${dueTime}`;
            } else {
                notificationBody = body && body !== title ? body : config.subtitle;
            }

            await Notifications.scheduleNotificationAsync({
                identifier: id,
                content: {
                    title: notificationTitle,
                    body: notificationBody,
                    sound: 'default',
                    badge: 1,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    data: { itemId: id, priority },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: date,
                    channelId: Platform.OS === 'android' ? 'reminders' : undefined,
                },
            });

            console.log(`Scheduled notification for "${title}" at ${date.toLocaleString()}`);
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
            console.log(`Cancelled notification ${id}`);
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

            console.log(`Cancelled ${matchingNotifications.length} notification(s) for item ${itemId}`);
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
     */
    scheduleOccurrenceReminder: async (
        itemId: string,
        title: string,
        reminderTime: Date,
        priority: 'high' | 'med' | 'low' = 'med'
    ): Promise<void> => {
        const notificationId = NotificationService.getOccurrenceNotificationId(itemId, reminderTime);

        // Use the existing scheduleReminder with the occurrence-specific ID
        await NotificationService.scheduleReminder(
            notificationId,
            title,
            '',
            reminderTime.toISOString(),
            priority
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
        item: { id: string; title: string; remindAt?: string | null; repeat?: string | null; priority?: string; skippedDates?: string | null; completedDates?: string | null },
        daysAhead: number = 7
    ): Promise<void> => {
        if (!item.remindAt || !item.repeat || item.repeat === 'none') {
            return;
        }

        const baseDate = new Date(item.remindAt);
        const now = new Date();
        const priority = (item.priority as 'high' | 'med' | 'low') || 'med';

        // Parse skipped and completed dates to avoid scheduling notifications for them
        const skippedDates: string[] = item.skippedDates
            ? JSON.parse(item.skippedDates)
            : [];
        const completedDates: string[] = item.completedDates
            ? JSON.parse(item.completedDates)
            : [];

        console.log(`Scheduling ${daysAhead} days of notifications for "${item.title}"`);

        if (item.repeat === 'daily') {
            for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
                const occurrenceDate = new Date(now);
                occurrenceDate.setDate(occurrenceDate.getDate() + dayOffset);
                occurrenceDate.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);

                // Check if this date is skipped or completed (use local date to match stored format)
                const year = occurrenceDate.getFullYear();
                const month = String(occurrenceDate.getMonth() + 1).padStart(2, '0');
                const day = String(occurrenceDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                if (skippedDates.includes(dateStr)) {
                    console.log(`Skipping notification for "${item.title}" on ${dateStr} (skipped)`);
                    continue;
                }

                if (completedDates.includes(dateStr)) {
                    console.log(`Skipping notification for "${item.title}" on ${dateStr} (completed)`);
                    continue;
                }

                // Only schedule if in the future
                if (occurrenceDate > now) {
                    await NotificationService.scheduleOccurrenceReminder(
                        item.id,
                        item.title,
                        occurrenceDate,
                        priority
                    );
                }
            }
        } else if (item.repeat === 'weekly') {
            // Schedule next 2 weekly occurrences within daysAhead
            for (let weekOffset = 0; weekOffset <= Math.ceil(daysAhead / 7); weekOffset++) {
                const occurrenceDate = new Date(baseDate);
                occurrenceDate.setDate(occurrenceDate.getDate() + (weekOffset * 7));

                if (occurrenceDate > now) {
                    await NotificationService.scheduleOccurrenceReminder(
                        item.id,
                        item.title,
                        occurrenceDate,
                        priority
                    );
                }
            }
        } else if (item.repeat === 'monthly') {
            // Schedule next month's occurrence if within daysAhead
            const nextMonth = new Date(baseDate);
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            if (nextMonth > now) {
                await NotificationService.scheduleOccurrenceReminder(
                    item.id,
                    item.title,
                    nextMonth,
                    priority
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

        console.log(`Cancelled all occurrence notifications for item ${itemId}`);
    },

    /**
     * Extend notifications for a repeating item by scheduling one more day
     * Called when a notification fires to keep the rolling window going
     * @param item - The item to extend notifications for
     * @param daysFromNow - How many days from today to schedule (default 7)
     */
    extendNextOccurrence: async (
        item: { id: string; title: string; remindAt?: string | null; repeat?: string | null; priority?: string },
        daysFromNow: number = 7
    ): Promise<void> => {
        if (!item.remindAt || !item.repeat || item.repeat === 'none') {
            return;
        }

        const baseTime = new Date(item.remindAt);
        const now = new Date();
        const priority = (item.priority as 'high' | 'med' | 'low') || 'med';

        // Calculate the target date (7 days from now)
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + daysFromNow);
        targetDate.setHours(baseTime.getHours(), baseTime.getMinutes(), 0, 0);

        // Schedule based on repeat type
        if (item.repeat === 'daily') {
            await NotificationService.scheduleOccurrenceReminder(
                item.id,
                item.title,
                targetDate,
                priority
            );
            console.log(`Extended notification for "${item.title}" to ${targetDate.toLocaleString()}`);
        } else if (item.repeat === 'weekly') {
            // For weekly, check if targetDate falls on the same day of week as the original
            const originalDayOfWeek = baseTime.getDay();
            if (targetDate.getDay() === originalDayOfWeek) {
                await NotificationService.scheduleOccurrenceReminder(
                    item.id,
                    item.title,
                    targetDate,
                    priority
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
            console.log('Cancelled all notifications');
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
