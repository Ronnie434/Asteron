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
 * Only counts items that are actually due today or overdue (from past days)
 */
const calculateBadgeCount = (items: Item[]): number => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    let count = 0;
    const debugLog: string[] = []; // For debugging

    for (const item of items) {
        if (item.status !== 'active') continue;
        if (!item.remindAt) continue;

        const baseDate = new Date(item.remindAt);

        // Handle repeating items
        if (item.repeat && item.repeat !== 'none') {
            const completedDates = item.completedDates ? JSON.parse(item.completedDates) : [];
            const skippedDates = item.skippedDates ? JSON.parse(item.skippedDates) : [];
            const createdAt = new Date(item.createdAt);

            let shouldCount = false;

            // Check today and past 3 days for uncompleted occurrences
            for (let daysBack = 0; daysBack <= 3; daysBack++) {
                const checkDate = new Date(now);
                checkDate.setDate(checkDate.getDate() - daysBack);
                const checkDateStart = new Date(checkDate);
                checkDateStart.setHours(0, 0, 0, 0);

                // Calculate the occurrence date for this check date
                let occurrenceDate: Date | null = null;

                if (item.repeat === 'daily') {
                    occurrenceDate = new Date(checkDateStart);
                    occurrenceDate.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);
                } else if (item.repeat === 'weekly') {
                    // Check if this date matches the weekly recurrence
                    const daysDiff = Math.floor((checkDateStart.getTime() - new Date(baseDate).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
                    if (daysDiff >= 0 && daysDiff % 7 === 0) {
                        occurrenceDate = new Date(checkDateStart);
                        occurrenceDate.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);
                    }
                } else if (item.repeat === 'monthly') {
                    // Check if this month's occurrence date matches
                    const monthsFromBase = (checkDate.getFullYear() - baseDate.getFullYear()) * 12
                        + (checkDate.getMonth() - baseDate.getMonth());
                    const thisMonthOccurrence = new Date(baseDate);
                    thisMonthOccurrence.setMonth(baseDate.getMonth() + monthsFromBase);

                    // Check if this occurrence date is the check date
                    const occurrenceStart = new Date(thisMonthOccurrence);
                    occurrenceStart.setHours(0, 0, 0, 0);
                    if (occurrenceStart.getTime() === checkDateStart.getTime()) {
                        occurrenceDate = thisMonthOccurrence;
                    }
                } else if (item.repeat === 'yearly') {
                    // Check if this year's occurrence date matches
                    const yearsFromBase = checkDate.getFullYear() - baseDate.getFullYear();
                    const thisYearOccurrence = new Date(baseDate);
                    thisYearOccurrence.setFullYear(baseDate.getFullYear() + yearsFromBase);

                    const occurrenceStart = new Date(thisYearOccurrence);
                    occurrenceStart.setHours(0, 0, 0, 0);
                    if (occurrenceStart.getTime() === checkDateStart.getTime()) {
                        occurrenceDate = thisYearOccurrence;
                    }
                }

                // If there's an occurrence on this date
                if (occurrenceDate && occurrenceDate >= createdAt) {
                    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;

                    // Check if remind time has passed AND not completed/skipped
                    if (occurrenceDate <= now &&
                        !completedDates.includes(dateStr) &&
                        !skippedDates.includes(dateStr)) {
                        shouldCount = true;
                        debugLog.push(`✅ ${item.title} (${item.repeat}) - occurrence on ${dateStr}`);
                        break; // Only count once per item
                    }
                }
            }

            if (shouldCount) count++;
        } else {
            // One-time task: count if remind time has passed
            if (baseDate <= now) {
                count++;
                debugLog.push(`✅ ${item.title} (one-time) - remind at ${baseDate.toLocaleString()}`);
            }
        }
    }

    // Log debug info (remove in production)
    if (debugLog.length > 0) {
        console.log('[Badge Count Debug] Counted items:', count);
        debugLog.forEach(log => console.log(log));
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
                                item.remindAt,
                                item.dueAt || null
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
                        newItem.remindAt,
                        newItem.dueAt || null
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
                    const dueAt = patch.dueAt ?? currentItem.dueAt;
                    await NotificationService.scheduleReminder(id, title, patch.remindAt, dueAt || null);
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
        const { user } = useAuthStore.getState();
        if (!user) return;

        // FETCH FRESH DATA first to avoid stale state overwrites
        const { data: freshItem, error: fetchError } = await supabase
            .from('user_items')
            .select('*')
            .eq('local_id', id)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !freshItem) {
            console.error('[ItemsStore] Failed to fetch fresh item for markAsDone:', fetchError);
            return;
        }

        const currentItem = freshItem;

        if (currentItem.repeat && currentItem.repeat !== 'none' && occurrenceDate) {
            await NotificationService.cancelOccurrenceReminder(id, occurrenceDate);

            let completedDates: string[] = [];
            try {
                if (currentItem.completed_dates) {
                    // unexpected token - means it might be a raw string like "2025-01-01"
                    if (typeof currentItem.completed_dates === 'string' &&
                        currentItem.completed_dates.match(/^\d{4}-\d{2}-\d{2}/)) {
                        // Check if it's already a valid date string but NOT a JSON string
                        if (!currentItem.completed_dates.startsWith('[')) {
                            completedDates = [currentItem.completed_dates];
                        } else {
                            completedDates = JSON.parse(currentItem.completed_dates);
                        }
                    } else if (Array.isArray(currentItem.completed_dates)) {
                        // Supabase might return JSONB as actual array if typed that way
                        completedDates = currentItem.completed_dates;
                    } else {
                        completedDates = JSON.parse(currentItem.completed_dates);
                    }
                }
            } catch (e) {
                console.warn('[ItemsStore] Failed to parse completed_dates, recovering:', currentItem.completed_dates);
                // Recovery: if it looks like a date, use it
                if (typeof currentItem.completed_dates === 'string' && currentItem.completed_dates.length === 10) {
                    completedDates = [currentItem.completed_dates];
                } else {
                    completedDates = [];
                }
            }

            // Use local date to avoid timezone issues
            const year = occurrenceDate.getFullYear();
            const month = String(occurrenceDate.getMonth() + 1).padStart(2, '0');
            const day = String(occurrenceDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            if (!completedDates.includes(dateStr)) {
                completedDates.push(dateStr);
                // Update Supabase directly
                const { error: updateError } = await supabase
                    .from('user_items')
                    .update({ completed_dates: JSON.stringify(completedDates) })
                    .eq('local_id', id)
                    .eq('user_id', user.id);

                if (!updateError) {
                    await get().loadItems(); // Refresh local state
                }
            }
        } else if (currentItem.repeat && currentItem.repeat !== 'none') {
            const today = new Date();
            await get().markAsDone(id, today);
        } else {
            await NotificationService.cancelReminder(id);
            // Standard update
            await get().updateItem(id, { status: 'done' });
        }
    },

    markAsUndone: async (id, occurrenceDate?: Date) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        // FETCH FRESH DATA first
        const { data: freshItem, error: fetchError } = await supabase
            .from('user_items')
            .select('*')
            .eq('local_id', id)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !freshItem) {
            console.error('[ItemsStore] Failed to fetch fresh item for markAsUndone:', fetchError);
            return;
        }

        const currentItem = freshItem;

        if (currentItem.repeat && currentItem.repeat !== 'none' && occurrenceDate) {
            // Remove this date from completedDates
            let completedDates: string[] = [];
            try {
                if (currentItem.completed_dates) {
                    // Check if it's already a valid date string but NOT a JSON string
                    if (typeof currentItem.completed_dates === 'string' &&
                        currentItem.completed_dates.match(/^\d{4}-\d{2}-\d{2}/) &&
                        !currentItem.completed_dates.startsWith('[')) {
                        completedDates = [currentItem.completed_dates];
                    } else if (Array.isArray(currentItem.completed_dates)) {
                        completedDates = currentItem.completed_dates;
                    } else {
                        completedDates = JSON.parse(currentItem.completed_dates);
                    }
                }
            } catch (e) {
                console.warn('[ItemsStore] Failed to parse completed_dates in markAsUndone, recovering:', currentItem.completed_dates);
                if (typeof currentItem.completed_dates === 'string' && currentItem.completed_dates.length === 10) {
                    completedDates = [currentItem.completed_dates];
                } else {
                    completedDates = [];
                }
            }

            // Use local date format
            const year = occurrenceDate.getFullYear();
            const month = String(occurrenceDate.getMonth() + 1).padStart(2, '0');
            const day = String(occurrenceDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const updatedDates = completedDates.filter((d: string) => d !== dateStr);

            // Update Supabase directly
            const { error: updateError } = await supabase
                .from('user_items')
                .update({ completed_dates: JSON.stringify(updatedDates) })
                .eq('local_id', id)
                .eq('user_id', user.id);

            if (!updateError) {
                await get().loadItems();
            }

            // Re-schedule notification if it's in the future
            if (currentItem.remind_at) {
                const baseDate = new Date(currentItem.remind_at);
                const reminderTime = new Date(occurrenceDate);
                reminderTime.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);

                // Compute due time if dueAt exists
                let dueTime: Date | null = null;
                if (currentItem.due_at) {
                    const baseDue = new Date(currentItem.due_at);
                    dueTime = new Date(occurrenceDate);
                    dueTime.setHours(baseDue.getHours(), baseDue.getMinutes(), 0, 0);
                }

                if (reminderTime > new Date()) {
                    await NotificationService.scheduleOccurrenceReminder(
                        id,
                        currentItem.title,
                        reminderTime,
                        dueTime
                    );
                    console.log(`[ItemsStore] Re-scheduled notification for "${currentItem.title}" on ${dateStr}`);
                }
            }
        } else if (currentItem.repeat && currentItem.repeat !== 'none') {
            // Repeating task without specific date - use today
            const today = new Date();
            await get().markAsUndone(id, today);
        } else {
            // Standard one-time item
            // Reschedule if needed
            if (currentItem.remind_at && new Date(currentItem.remind_at) > new Date()) {
                await NotificationService.scheduleReminder(
                    id,
                    currentItem.title,
                    currentItem.remind_at,
                    currentItem.due_at
                );
            }
            await get().updateItem(id, { status: 'active' });
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
