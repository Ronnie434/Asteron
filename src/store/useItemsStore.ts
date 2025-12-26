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
    markAsDone: (id: string) => Promise<void>;
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

            // Schedule notification if reminder is set
            if (newItem.remindAt) {
                await NotificationService.scheduleReminder(
                    newItem.id,
                    newItem.title,
                    newItem.details || "",
                    newItem.remindAt,
                    newItem.priority
                );
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
            await NotificationService.cancelReminder(id);
            await DB.deleteItem(id);
            await get().loadItems();
        } catch (e) {
            console.error("Failed to delete item:", e);
        }
    },

    markAsDone: async (id) => {
        const currentItem = get().items.find(i => i.id === id);

        // If it's a recurring item, reschedule instead of marking done
        if (currentItem?.repeat && currentItem.repeat !== 'none') {
            const now = new Date();
            const baseDate = currentItem.remindAt ? new Date(currentItem.remindAt) : now;

            // Parse repeatConfig for custom repeat
            let repeatConfig: CustomRepeatConfig | null = null;
            if (currentItem.repeat === 'custom' && currentItem.repeatConfig) {
                try {
                    repeatConfig = JSON.parse(currentItem.repeatConfig);
                } catch (e) {
                    console.error('Failed to parse repeatConfig:', e);
                }
            }

            const nextDate = calculateNextOccurrence(baseDate, currentItem.repeat, repeatConfig);

            const patch: Partial<Item> = {
                remindAt: nextDate.toISOString(),
            };

            // Also update dueAt if it was set
            if (currentItem.dueAt) {
                const baseDueDate = new Date(currentItem.dueAt);
                patch.dueAt = calculateNextOccurrence(baseDueDate, currentItem.repeat, repeatConfig).toISOString();
            }

            // Update the item with new dates (notification will be rescheduled in updateItem)
            await get().updateItem(id, patch);
            console.log(`Recurring item "${currentItem.title}" rescheduled to ${nextDate.toLocaleString()}`);
        } else {
            // Non-recurring: just mark as done
            await get().updateItem(id, { status: 'done' });
        }
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
