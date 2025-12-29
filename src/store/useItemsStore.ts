import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { supabase } from '../services/supabase';
import { NotificationService } from '../services/NotificationService';
import { useAuthStore } from './useAuthStore';

// Types matching Supabase schema
export type ItemType = 'task' | 'bill' | 'renewal' | 'followup' | 'reminder' | 'note';
export type ItemPriority = 'low' | 'med' | 'high';
export type ItemStatus = 'active' | 'done' | 'archived';
export type RepeatFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface CustomRepeatConfig {
    days: number[];
    intervalWeeks: number;
}

export interface Item {
    id: string;
    title: string;
    details?: string | null;
    type: ItemType;
    dueAt?: string | null;
    remindAt?: string | null;
    repeat?: RepeatFrequency | null;
    repeatConfig?: string | null;
    skippedDates?: string | null;
    completedDates?: string | null;
    priority: ItemPriority;
    status: ItemStatus;
    confidence: number;
    createdAt: string;
    updatedAt: string;
}

// Supabase row type
interface SupabaseItem {
    id: string;
    user_id: string;
    local_id: string;
    title: string;
    details: string | null;
    type: string;
    due_at: string | null;
    remind_at: string | null;
    repeat: string;
    repeat_config: object | null;
    skipped_dates: string[] | null;
    completed_dates: string[] | null;
    priority: string;
    status: string;
    confidence: number;
    created_at: string;
    updated_at: string;
}

// Convert Supabase row to local Item format
const fromSupabase = (row: SupabaseItem): Item => ({
    id: row.local_id,
    title: row.title,
    details: row.details,
    type: row.type as ItemType,
    dueAt: row.due_at,
    remindAt: row.remind_at,
    repeat: (row.repeat || 'none') as RepeatFrequency,
    repeatConfig: row.repeat_config ? JSON.stringify(row.repeat_config) : null,
    skippedDates: row.skipped_dates ? JSON.stringify(row.skipped_dates) : null,
    completedDates: row.completed_dates ? JSON.stringify(row.completed_dates) : null,
    priority: row.priority as ItemPriority,
    status: row.status as ItemStatus,
    confidence: row.confidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

// Convert local Item to Supabase format
const toSupabase = (item: Item, userId: string) => ({
    user_id: userId,
    local_id: item.id,
    title: item.title,
    details: item.details || null,
    type: item.type,
    due_at: item.dueAt || null,
    remind_at: item.remindAt || null,
    repeat: item.repeat || 'none',
    repeat_config: item.repeatConfig ? JSON.parse(item.repeatConfig) : null,
    skipped_dates: item.skippedDates ? JSON.parse(item.skippedDates) : null,
    completed_dates: item.completedDates ? JSON.parse(item.completedDates) : null,
    priority: item.priority,
    status: item.status,
    confidence: item.confidence,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
});

/**
 * Calculate badge count based on pending items
 */
const calculateBadgeCount = (items: Item[]): number => {
    const now = new Date();
    let count = 0;

    for (const item of items) {
        if (item.status !== 'active') continue;
        if (!item.remindAt) continue;

        if (item.repeat && item.repeat !== 'none') {
            const baseDate = new Date(item.remindAt);
            const occurrenceDate = new Date(now);
            occurrenceDate.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);

            if (occurrenceDate <= now) {
                const completedDates = item.completedDates ? JSON.parse(item.completedDates) : [];
                const skippedDates = item.skippedDates ? JSON.parse(item.skippedDates) : [];

                // Use local date to match stored format
                const year = occurrenceDate.getFullYear();
                const month = String(occurrenceDate.getMonth() + 1).padStart(2, '0');
                const day = String(occurrenceDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                if (!completedDates.includes(dateStr) && !skippedDates.includes(dateStr)) {
                    count++;
                }
            }
        } else {
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
    error: string | null;

    // Actions
    init: () => Promise<void>;
    loadItems: (refreshNotifications?: boolean) => Promise<void>;
    addItem: (
        title: string,
        initialProps?: Partial<Omit<Item, 'id' | 'title' | 'createdAt' | 'updatedAt'>>
    ) => Promise<void>;
    updateItem: (id: string, patch: Partial<Item>) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    markAsDone: (id: string, occurrenceDate?: Date) => Promise<void>;
    markAsUndone: (id: string, occurrenceDate?: Date) => Promise<void>;
    skipOccurrence: (id: string, occurrenceDate: Date) => Promise<void>;
    clearAllItems: () => Promise<void>;
}

export const useItemsStore = create<ItemsState>((set, get) => ({
    items: [],
    isLoading: false,
    initialized: false,
    error: null,

    init: async () => {
        if (get().initialized) return;
        set({ initialized: true });

        // On initial load, refresh all notifications
        await get().loadItems(true);
    },

    loadItems: async (refreshNotifications: boolean = false) => {
        const { user } = useAuthStore.getState();
        if (!user) {
            console.log('[ItemsStore] No user logged in, skipping load');
            set({ items: [], isLoading: false });
            return;
        }

        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('user_items')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[ItemsStore] Failed to load items:', error);
                set({ error: error.message, isLoading: false });
                return;
            }

            const items = (data || []).map(fromSupabase);
            console.log(`[ItemsStore] Loaded ${items.length} items from Supabase`);
            set({ items });

            // Only refresh notifications on initial app startup
            if (refreshNotifications) {
                console.log('[ItemsStore] Refreshing all notifications...');
                await NotificationService.cancelAllReminders();

                // Schedule notifications for active items with reminders
                for (const item of items) {
                    if (item.status !== 'active' || !item.remindAt) continue;

                    if (item.repeat && item.repeat !== 'none') {
                        await NotificationService.scheduleAllOccurrences(item, 7);
                    } else {
                        const remindDate = new Date(item.remindAt);
                        if (remindDate > new Date()) {
                            await NotificationService.scheduleReminder(
                                item.id,
                                item.title,
                                item.details || '',
                                item.remindAt,
                                item.priority
                            );
                        }
                    }
                }
            }

            // Always update badge count
            const count = calculateBadgeCount(items);
            await NotificationService.setBadgeCount(count);
        } catch (e) {
            console.error('[ItemsStore] Load error:', e);
            set({ error: 'Failed to load items' });
        } finally {
            set({ isLoading: false });
        }
    },

    addItem: async (title, initialProps = {}) => {
        const { user } = useAuthStore.getState();
        if (!user) {
            console.warn('[ItemsStore] Cannot add item: no user logged in');
            return;
        }

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
            const { error } = await supabase
                .from('user_items')
                .insert(toSupabase(newItem, user.id));

            if (error) {
                console.error('[ItemsStore] Failed to add item:', error);
                throw error;
            }

            // Schedule notification if reminder is set
            if (newItem.remindAt) {
                if (newItem.repeat && newItem.repeat !== 'none') {
                    await NotificationService.scheduleAllOccurrences(newItem, 7);
                } else {
                    await NotificationService.scheduleReminder(
                        newItem.id,
                        newItem.title,
                        newItem.details || '',
                        newItem.remindAt,
                        newItem.priority
                    );
                }
            }

            await get().loadItems();
        } catch (e) {
            console.error('[ItemsStore] Add error:', e);
            throw e;
        }
    },

    updateItem: async (id, patch) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        const currentItem = get().items.find(i => i.id === id);
        if (!currentItem) return;

        const updatedAt = new Date().toISOString();
        const updatedItem = { ...currentItem, ...patch, updatedAt };

        try {
            // Build Supabase update object
            const updateData: Record<string, any> = { updated_at: updatedAt };

            if (patch.title !== undefined) updateData.title = patch.title;
            if (patch.details !== undefined) updateData.details = patch.details;
            if (patch.type !== undefined) updateData.type = patch.type;
            if (patch.dueAt !== undefined) updateData.due_at = patch.dueAt;
            if (patch.remindAt !== undefined) updateData.remind_at = patch.remindAt;
            if (patch.repeat !== undefined) updateData.repeat = patch.repeat;
            if (patch.repeatConfig !== undefined) {
                updateData.repeat_config = patch.repeatConfig ? JSON.parse(patch.repeatConfig) : null;
            }
            if (patch.skippedDates !== undefined) {
                updateData.skipped_dates = patch.skippedDates ? JSON.parse(patch.skippedDates) : null;
            }
            if (patch.completedDates !== undefined) {
                updateData.completed_dates = patch.completedDates ? JSON.parse(patch.completedDates) : null;
            }
            if (patch.priority !== undefined) updateData.priority = patch.priority;
            if (patch.status !== undefined) updateData.status = patch.status;
            if (patch.confidence !== undefined) updateData.confidence = patch.confidence;

            const { error } = await supabase
                .from('user_items')
                .update(updateData)
                .eq('user_id', user.id)
                .eq('local_id', id);

            if (error) {
                console.error('[ItemsStore] Failed to update item:', error);
                return;
            }

            // Handle notifications
            if (patch.status === 'done' || patch.status === 'archived') {
                await NotificationService.cancelReminder(id);
            } else if (patch.remindAt !== undefined) {
                if (patch.remindAt) {
                    const title = patch.title ?? currentItem.title;
                    const details = patch.details ?? currentItem.details ?? '';
                    const priority = patch.priority ?? currentItem.priority;
                    await NotificationService.scheduleReminder(id, title, details, patch.remindAt, priority);
                } else {
                    await NotificationService.cancelReminder(id);
                }
            }

            await get().loadItems();
        } catch (e) {
            console.error('[ItemsStore] Update error:', e);
        }
    },

    deleteItem: async (id) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        try {
            await NotificationService.cancelAllNotificationsForItem(id);

            const { error } = await supabase
                .from('user_items')
                .delete()
                .eq('user_id', user.id)
                .eq('local_id', id);

            if (error) {
                console.error('[ItemsStore] Failed to delete item:', error);
                return;
            }

            await get().loadItems();
        } catch (e) {
            console.error('[ItemsStore] Delete error:', e);
        }
    },

    markAsDone: async (id, occurrenceDate?: Date) => {
        const currentItem = get().items.find(i => i.id === id);
        if (!currentItem) return;

        if (currentItem.repeat && currentItem.repeat !== 'none' && occurrenceDate) {
            await NotificationService.cancelOccurrenceReminder(id, occurrenceDate);

            const completedDates: string[] = currentItem.completedDates
                ? JSON.parse(currentItem.completedDates)
                : [];

            // Use local date to avoid timezone issues
            const year = occurrenceDate.getFullYear();
            const month = String(occurrenceDate.getMonth() + 1).padStart(2, '0');
            const day = String(occurrenceDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            if (!completedDates.includes(dateStr)) {
                completedDates.push(dateStr);
                await get().updateItem(id, { completedDates: JSON.stringify(completedDates) });
            }
        } else if (currentItem.repeat && currentItem.repeat !== 'none') {
            const today = new Date();
            await get().markAsDone(id, today);
        } else {
            await NotificationService.cancelReminder(id);
            await get().updateItem(id, { status: 'done' });
        }
    },

    markAsUndone: async (id, occurrenceDate?: Date) => {
        const currentItem = get().items.find(i => i.id === id);
        if (!currentItem) return;

        if (currentItem.repeat && currentItem.repeat !== 'none' && occurrenceDate) {
            // Remove this date from completedDates
            const completedDates: string[] = currentItem.completedDates
                ? JSON.parse(currentItem.completedDates)
                : [];

            // Use local date format
            const year = occurrenceDate.getFullYear();
            const month = String(occurrenceDate.getMonth() + 1).padStart(2, '0');
            const day = String(occurrenceDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const updatedDates = completedDates.filter((d: string) => d !== dateStr);
            await get().updateItem(id, { completedDates: JSON.stringify(updatedDates) });

            // Re-schedule notification if it's in the future
            if (currentItem.remindAt) {
                const baseDate = new Date(currentItem.remindAt);
                const reminderTime = new Date(occurrenceDate);
                reminderTime.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);

                if (reminderTime > new Date()) {
                    await NotificationService.scheduleOccurrenceReminder(
                        id,
                        currentItem.title,
                        reminderTime,
                        currentItem.priority
                    );
                    console.log(`[ItemsStore] Re-scheduled notification for "${currentItem.title}" on ${dateStr}`);
                }
            }
        } else if (currentItem.repeat && currentItem.repeat !== 'none') {
            // Repeating task without specific date - use today
            const today = new Date();
            await get().markAsUndone(id, today);
        } else {
            // One-time task: set status back to active and re-schedule notification
            await get().updateItem(id, { status: 'active' });

            // Re-schedule notification if reminder is in the future
            if (currentItem.remindAt) {
                const remindDate = new Date(currentItem.remindAt);
                if (remindDate > new Date()) {
                    await NotificationService.scheduleReminder(
                        id,
                        currentItem.title,
                        currentItem.details || '',
                        currentItem.remindAt,
                        currentItem.priority
                    );
                    console.log(`[ItemsStore] Re-scheduled notification for "${currentItem.title}"`);
                }
            }
        }
    },

    skipOccurrence: async (id, occurrenceDate) => {
        const currentItem = get().items.find(i => i.id === id);
        if (!currentItem) return;

        const skippedDates: string[] = currentItem.skippedDates
            ? JSON.parse(currentItem.skippedDates)
            : [];

        // Use local date to avoid timezone issues (toISOString converts to UTC which shifts the date)
        const year = occurrenceDate.getFullYear();
        const month = String(occurrenceDate.getMonth() + 1).padStart(2, '0');
        const day = String(occurrenceDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        console.log(`[ItemsStore] Skipping occurrence for "${currentItem.title}" on ${dateStr}`);

        if (!skippedDates.includes(dateStr)) {
            skippedDates.push(dateStr);
        }

        await get().updateItem(id, { skippedDates: JSON.stringify(skippedDates) });
        await NotificationService.cancelOccurrenceReminder(id, occurrenceDate);
    },

    clearAllItems: async () => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        try {
            // Cancel ALL notifications comprehensively
            await NotificationService.cancelAllReminders();

            const { error } = await supabase
                .from('user_items')
                .delete()
                .eq('user_id', user.id);

            if (error) {
                console.error('[ItemsStore] Failed to clear items:', error);
                return;
            }

            set({ items: [] });
            await NotificationService.setBadgeCount(0);
            console.log('[ItemsStore] All data cleared from Supabase');
        } catch (e) {
            console.error('[ItemsStore] Clear error:', e);
        }
    },
}));
