import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import * as DB from '../db/items';
import type { Item, ItemStatus, RepeatFrequency, CustomRepeatConfig } from '../db/items';
import { NotificationService } from '../services/NotificationService';

/**
 * Calculate the next occurrence date for a repeating item
 * For 'custom' repeat, uses the repeatConfig to find the next matching day
 */
const calculateNextOccurrence = (
    currentDate: Date,
    repeat: RepeatFrequency,
    repeatConfig?: CustomRepeatConfig | null
): Date => {
    const next = new Date(currentDate);

    switch (repeat) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            break;
        case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            break;
        case 'yearly':
            next.setFullYear(next.getFullYear() + 1);
            break;
        case 'custom':
            if (repeatConfig && repeatConfig.days.length > 0) {
                // Find the next matching day of week
                const currentDay = next.getDay();
                const sortedDays = [...repeatConfig.days].sort((a, b) => a - b);

                // Find next day in current week
                let foundNextDay = false;
                for (const day of sortedDays) {
                    if (day > currentDay) {
                        // Found a day later this week
                        next.setDate(next.getDate() + (day - currentDay));
                        foundNextDay = true;
                        break;
                    }
                }

                if (!foundNextDay) {
                    // No day later this week, go to first day of next interval
                    const daysUntilNextWeek = 7 - currentDay + sortedDays[0];
                    const intervalDays = (repeatConfig.intervalWeeks - 1) * 7;
                    next.setDate(next.getDate() + daysUntilNextWeek + intervalDays);
                }
            } else {
                // Fallback: treat as weekly if no config
                next.setDate(next.getDate() + 7);
            }
            break;
        default:
            break;
    }

    return next;
};

/**
 * Calculate badge count based on pending items
 * Rules:
 * - Active items only
 * - Non-repeating: remindAt is in the past
 * - Repeating: Today's occurrence is effectively "due" if we are past the reminder time. 
 *   For simplicity in V1: if it has a reminder set, and that reminder is in the past (globally for non-repeating, or 'today' for repeating), count it.
 *   Actually, for repeating items, we need to check if *today's* specific reminder time has passed AND it's not completed.
 */
const calculateBadgeCount = (items: Item[]): number => {
    const now = new Date();
    let count = 0;

    for (const item of items) {
        if (item.status !== 'active') continue;
        if (!item.remindAt) continue;

        // Check if item is snoozed or skipped? (We don't have snooze yet, just skippedDates)

        if (item.repeat && item.repeat !== 'none') {
            // Repeating item
            // Check if there is an occurrence TODAY or in the PAST that is unfinished
            // For now, let's look at "Today" specifically as the primary driver for "Active functionality"
            // If the user ignored yesterday's task, does it still show as a badge?
            // "we should see the badge count for all the task which are overdue condition"

            // Logic: Check if there's any valid occurrence <= Now that isn't completed.
            // Simplified approach: Check Today's occurrence.

            const baseDate = new Date(item.remindAt);
            const occurrenceDate = new Date(now);
            occurrenceDate.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);

            // If occurrence is within today (or past days if we want to be strict about overdue)
            // Let's check TODAY first.
            if (occurrenceDate <= now) {
                // It's due today (passed time). Is it done?
                const completedDates = item.completedDates ? JSON.parse(item.completedDates) : [];
                const skippedDates = item.skippedDates ? JSON.parse(item.skippedDates) : [];

                // We use the "date string" of the occurrence.
                // Note: useItemsStore logic usually uses local date string for these checks
                const dateStr = occurrenceDate.toISOString().split('T')[0];

                if (!completedDates.includes(dateStr) && !skippedDates.includes(dateStr)) {
                    count++;
                }
            }

            // Should we check yesterday?
            // If I had a daily task yesterday and didn't do it, it should essentially be "Overdue".
            // Ideally we iterate back a few days?
            // For this iteration, let's stick to "Today's pending tasks" + "One-time overdue tasks".
            // If the user wants "All overdue", we'd need to calculate "Last completed date" and count days since then? 
            // That might be too aggressive (badge = 100 for 100 days missed).
            // Let's count "1" if the item itself is "overdue" (hasn't been done for the latest period).
            // But `occurrenceDate <= now` above covers "Today".
        } else {
            // Non-repeating
            const remindDate = new Date(item.remindAt);
            if (remindDate <= now) {
                count++;
            }
        }
    }
    return count;
};

interface ItemsState {
    items: Item[];
    isLoading: boolean;
    initialized: boolean;

    // Actions
    init: () => Promise<void>;
    loadItems: () => Promise<void>;
    addItem: (
        title: string,
        initialProps?: Partial<Omit<Item, 'id' | 'title' | 'createdAt' | 'updatedAt'>>
    ) => Promise<void>;
    updateItem: (id: string, patch: Partial<Item>) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    markAsDone: (id: string, occurrenceDate?: Date) => Promise<void>;
    skipOccurrence: (id: string, occurrenceDate: Date) => Promise<void>;
    clearAllItems: () => Promise<void>;
}

export const useItemsStore = create<ItemsState>((set, get) => ({
    items: [],
    isLoading: false,
    initialized: false,

    init: async () => {
        if (get().initialized) return;
        try {
            await DB.initDb();
            set({ initialized: true });
            await get().loadItems();
        } catch (e) {
            console.error("Failed to init DB:", e);
        }
    },

    updateBadgeCount: async () => {
        const items = get().items;
        const count = calculateBadgeCount(items);
        await NotificationService.setBadgeCount(count);
    },

    loadItems: async () => {
        set({ isLoading: true });
        try {
            // For now load all active items by default? Or just all items?
            // Let's load everything for simplicity unless we filter in UI
            const items = await DB.listItems();
            set({ items });

            // Refresh notifications for all repeating items to ensure they're in sync
            for (const item of items) {
                if (item.repeat && item.repeat !== 'none' && item.status === 'active' && item.remindAt) {
                    await NotificationService.scheduleAllOccurrences(item, 7);
                }
            }

            // Update badge count
            const count = calculateBadgeCount(items);
            await NotificationService.setBadgeCount(count);
        } catch (e) {
            console.error("Failed to load items:", e);
        } finally {
            set({ isLoading: false });
        }
    },

    addItem: async (title, initialProps = {}) => {
        // Ensure title is never null or empty
        const safeTitle = (title || '').trim() || 'Untitled';

        const now = new Date().toISOString();
        const newItem: Item = {
            id: Crypto.randomUUID(),
            title: safeTitle,
            type: 'task',
            priority: 'med',
            status: 'active',
            confidence: 1.0,
            details: null,
            dueAt: null,
            remindAt: null,
            repeat: 'none',
            repeatConfig: null,
            createdAt: now,
            updatedAt: now,
            ...initialProps,
        };

        try {
            await DB.createItem(newItem);

            // Schedule notification(s) if reminder is set
            if (newItem.remindAt) {
                if (newItem.repeat && newItem.repeat !== 'none') {
                    // For repeating items, schedule next 7 days of notifications
                    await NotificationService.scheduleAllOccurrences(newItem, 7);
                } else {
                    // For one-time items, schedule single notification
                    await NotificationService.scheduleReminder(
                        newItem.id,
                        newItem.title,
                        newItem.details || "",
                        newItem.remindAt,
                        newItem.priority
                    );
                }
            }

            await get().loadItems();
        } catch (e) {
            console.error("Failed to add item:", e);
            throw e; // Re-throw so caller can handle
        }
    },

    updateItem: async (id, patch) => {
        try {
            // Get current item to compare
            const currentItem = get().items.find(i => i.id === id);

            const updatedAt = new Date().toISOString();
            await DB.updateItem(id, { ...patch, updatedAt });

            // Handle Notification logic
            if (patch.status === 'done' || patch.status === 'archived') {
                // If completing, remove reminder
                await NotificationService.cancelReminder(id);
                // Badge update happens in loadItems call below
            } else if (patch.remindAt !== undefined) {
                // If reminder time changed
                if (patch.remindAt) {
                    // Re-schedule
                    // Use new title/details if provided, else fall back to current
                    const title = patch.title ?? currentItem?.title ?? "Reminder";
                    const details = patch.details ?? currentItem?.details ?? "";
                    const priority = patch.priority ?? currentItem?.priority ?? 'med';

                    await NotificationService.scheduleReminder(id, title, details, patch.remindAt, priority);
                } else {
                    // Reminder cleared
                    await NotificationService.cancelReminder(id);
                }
            } else if (patch.title && currentItem?.remindAt) {
                // If title changed but reminder exists, update notification text
                await NotificationService.scheduleReminder(id, patch.title, currentItem.details || "", currentItem.remindAt, currentItem.priority);
            }

            await get().loadItems();
        } catch (e) {
            console.error("Failed to update item:", e);
        }
    },

    deleteItem: async (id) => {
        try {
            // Cancel ALL notifications for this item (comprehensive cleanup)
            await NotificationService.cancelAllNotificationsForItem(id);

            await DB.deleteItem(id);
            await get().loadItems();
        } catch (e) {
            console.error("Failed to delete item:", e);
        }
    },

    /**
     * Mark an item as done. For repeating items, only cancels the specific occurrence's notification.
     * @param id - Item ID
     * @param occurrenceDate - Optional: specific occurrence date for repeating items
     */
    markAsDone: async (id, occurrenceDate?: Date) => {
        const currentItem = get().items.find(i => i.id === id);
        if (!currentItem) return;

        // If it's a recurring item with an occurrence date
        if (currentItem.repeat && currentItem.repeat !== 'none' && occurrenceDate) {
            // Cancel only this occurrence's notification
            await NotificationService.cancelOccurrenceReminder(id, occurrenceDate);
            console.log(`Cancelled notification for "${currentItem.title}" on ${occurrenceDate.toDateString()}`);

            // Persist completed date
            const completedDates: string[] = currentItem.completedDates
                ? JSON.parse(currentItem.completedDates)
                : [];

            const dateStr = occurrenceDate.toISOString().split('T')[0];
            if (!completedDates.includes(dateStr)) {
                completedDates.push(dateStr);
                // Update item with new completed dates
                await get().updateItem(id, { completedDates: JSON.stringify(completedDates) });

                // Update badge (markAsDone calls updateItem, but internal DB update doesn't trigger loadItems usually if accessed directly... wait, updateItem calls loadItems.
                // But updateItem calls DB.updateItem then get().loadItems().
                // So get().updateItem(...) above WILL trigger loadItems which updates badge.
                // BUT, let's be safe and ensure badge is updated. 
                // Actually updateItem calls loadItems, so we are good.
            }
        } else if (currentItem.repeat && currentItem.repeat !== 'none') {
            // Recurring item without occurrence date (legacy/fallback)
            // Just mark today as completed
            const today = new Date();
            await get().markAsDone(id, today);
        } else {
            // Non-recurring: mark as done and cancel notification
            await NotificationService.cancelReminder(id);
            await get().updateItem(id, { status: 'done' });
        }
    },

    /**
     * Skip a specific occurrence of a repeating item (delete just that day)
     * @param id - Item ID
     * @param occurrenceDate - The date to skip
     */
    skipOccurrence: async (id, occurrenceDate) => {
        const currentItem = get().items.find(i => i.id === id);
        if (!currentItem) return;

        // Parse existing skippedDates or start fresh
        const skippedDates: string[] = currentItem.skippedDates
            ? JSON.parse(currentItem.skippedDates)
            : [];

        // Add this date to the list (YYYY-MM-DD format)
        const dateStr = occurrenceDate.toISOString().split('T')[0];
        if (!skippedDates.includes(dateStr)) {
            skippedDates.push(dateStr);
        }

        // Update the item with new skippedDates
        await get().updateItem(id, { skippedDates: JSON.stringify(skippedDates) });

        // Cancel the notification for this date
        await NotificationService.cancelOccurrenceReminder(id, occurrenceDate);

        console.log(`Skipped occurrence of "${currentItem.title}" on ${dateStr}`);
    },

    clearAllItems: async () => {
        try {
            const items = get().items;
            for (const item of items) {
                await NotificationService.cancelReminder(item.id);
                await DB.deleteItem(item.id);
            }
            set({ items: [] });
            await NotificationService.setBadgeCount(0);

            // Also cancel all notifications in system generally? 
            // Better to stay precise to IDs, but we could do cancelAll
            // await Notifications.cancelAllScheduledNotificationsAsync(); 
        } catch (e) {
            console.error("Failed to clear all items:", e);
        }
    },
}));

