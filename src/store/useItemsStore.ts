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
                // If completing, remove reminder and decrement badge
                await NotificationService.cancelReminder(id);
                // Decrement badge since task is done
                const currentBadge = await NotificationService.getBadgeCount();
                if (currentBadge > 0) {
                    await NotificationService.setBadgeCount(currentBadge - 1);
                }
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
            const currentItem = get().items.find(i => i.id === id);

            // Cancel notifications - use cancelAllOccurrences for repeating items
            if (currentItem?.repeat && currentItem.repeat !== 'none') {
                await NotificationService.cancelAllOccurrences(id, 14); // Cancel 14 days of occurrence notifications
            } else {
                await NotificationService.cancelReminder(id);
            }

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

        // If it's a recurring item with an occurrence date, just cancel that occurrence's notification
        if (currentItem.repeat && currentItem.repeat !== 'none' && occurrenceDate) {
            // Cancel only this occurrence's notification
            await NotificationService.cancelOccurrenceReminder(id, occurrenceDate);
            console.log(`Cancelled notification for "${currentItem.title}" on ${occurrenceDate.toDateString()}`);
            // Do NOT modify remindAt - it stays as the template time
        } else if (currentItem.repeat && currentItem.repeat !== 'none') {
            // Recurring item without occurrence date (legacy call) - cancel today's notification
            const today = new Date();
            await NotificationService.cancelOccurrenceReminder(id, today);
            console.log(`Cancelled today's notification for "${currentItem.title}"`);
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

            // Also cancel all notifications in system generally? 
            // Better to stay precise to IDs, but we could do cancelAll
            // await Notifications.cancelAllScheduledNotificationsAsync(); 
        } catch (e) {
            console.error("Failed to clear all items:", e);
        }
    },
}));
