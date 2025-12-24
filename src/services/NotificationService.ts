import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications behave when the app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const NotificationService = {
    requestPermissions: async () => {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        return finalStatus === 'granted';
    },

    scheduleReminder: async (id: string, title: string, body: string, dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();

            // Don't schedule in the past
            if (date.getTime() <= now.getTime()) return;

            // cancel any existing notification for this item to avoid duplicates
            await Notifications.cancelScheduledNotificationAsync(id);

            await Notifications.scheduleNotificationAsync({
                identifier: id,
                content: {
                    title: "🔔 " + title,
                    body: body || "Here is your reminder",
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: date,
                },
            });
            console.log(`Scheduled notification for ${id} at ${date.toLocaleString()}`);
        } catch (e) {
            console.error("Failed to schedule notification:", e);
        }
    },

    cancelReminder: async (id: string) => {
        try {
            await Notifications.cancelScheduledNotificationAsync(id);
        } catch (e) {
            console.error("Failed to cancel notification:", e);
        }
    }
};
