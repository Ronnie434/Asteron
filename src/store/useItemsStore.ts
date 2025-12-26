import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import * as DB from '../db/items';
import type { Item, ItemStatus } from '../db/items';
import { NotificationService } from '../services/NotificationService';

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
        // This calls updateItem, which handles the cancellation logic
        await get().updateItem(id, { status: 'done' });
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
