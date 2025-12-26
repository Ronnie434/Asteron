import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';

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
