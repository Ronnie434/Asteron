import type { Item, RepeatFrequency, CustomRepeatConfig } from '../db/items';
import { formatLocalDate as formatLocalDateUtil, safeIsoDate } from './dateUtils';

/**
 * Expanded item with a computed display date for virtual occurrences
 */
export interface ExpandedItem extends Item {
    displayDate: Date;
    isVirtualOccurrence?: boolean; // True if this is a generated occurrence, not the base item
    isCompleted?: boolean; // True if this occurrence is completed (for display and sorting)
}

/**
 * Get the effective date from an item (dueAt or remindAt)
 */
export const getEffectiveDate = (item: Item): string | null => {
    return item.dueAt || item.remindAt || null;
};

const formatLocalDate = formatLocalDateUtil;

// Re-export for backward compatibility
export { formatLocalDate };

/**
 * Expand repeating items into virtual occurrences for display
 * 
 * @param items - Array of items to expand
 * @param daysToExpand - Number of days to generate occurrences for (default 7)
 * @param includeOverdue - Whether to include past occurrences (default false)
 * @returns Array of expanded items with displayDate property
 */
export function expandRepeatingItems(
    items: Item[],
    daysToExpand: number = 7,
    includeOverdue: boolean = false
): ExpandedItem[] {
    const now = new Date();
    const expanded: ExpandedItem[] = [];

    items.forEach(item => {
        // Include active items AND done items (so completed tasks show at bottom)
        if (item.status !== 'active' && item.status !== 'done') return;

        const effectiveDate = getEffectiveDate(item);
        const safeEffectiveDate = effectiveDate ? safeIsoDate(effectiveDate) : null;

        // Daily repeat: add an entry for each day
        if (item.repeat === 'daily') {
            // Parse skipped and completed dates
            const skippedDates: string[] = item.skippedDates
                ? JSON.parse(item.skippedDates)
                : [];
            const completedDates: string[] = item.completedDates
                ? JSON.parse(item.completedDates)
                : [];

            const createdAt = new Date(item.createdAt);

            for (let dayOffset = 0; dayOffset < daysToExpand; dayOffset++) {
                const displayDate = new Date(now);
                displayDate.setDate(displayDate.getDate() + dayOffset);

                // If item has a time, use that time
                if (safeEffectiveDate) {
                    const originalDate = new Date(safeEffectiveDate);
                    displayDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
                }

                // Skip if task was created AFTER this occurrence's time
                // (e.g., created at 10:49 AM, occurrence is 10:30 AM today - skip today)
                if (createdAt > displayDate) continue;

                // Get start of today for date comparison
                const todayStart = new Date(now);
                todayStart.setHours(0, 0, 0, 0);

                // Skip only if occurrence is from a PREVIOUS day (not today's past time)
                // Today's tasks stay visible until the day ends, even if time has passed
                if (!includeOverdue && displayDate < todayStart) continue;

                // Skip if this date is in the skippedDates list
                const dateStr = formatLocalDate(displayDate);
                if (skippedDates.includes(dateStr)) continue;

                // Check if this occurrence is completed
                const isCompleted = completedDates.includes(dateStr);

                expanded.push({
                    ...item,
                    displayDate,
                    isVirtualOccurrence: dayOffset > 0,
                    isCompleted,
                });
            }
            return;
        }

        // Weekly repeat: add entries for each week within the range
        if (item.repeat === 'weekly' && safeEffectiveDate) {
            const baseDate = new Date(safeEffectiveDate);
            const completedDates: string[] = item.completedDates
                ? JSON.parse(item.completedDates)
                : [];
            const skippedDates: string[] = item.skippedDates
                ? JSON.parse(item.skippedDates)
                : [];

            const endDate = new Date(now);
            endDate.setDate(endDate.getDate() + daysToExpand);

            const createdAt = new Date(item.createdAt);

            // Generate all weekly occurrences from now to endDate
            for (let weekOffset = 0; weekOffset <= Math.ceil(daysToExpand / 7) + 1; weekOffset++) {
                const displayDate = new Date(baseDate);
                displayDate.setDate(displayDate.getDate() + (weekOffset * 7));

                // Skip if before creation time
                if (displayDate < createdAt) continue;

                // Skip if before now (unless includeOverdue is true)
                const todayStart = new Date(now);
                todayStart.setHours(0, 0, 0, 0);
                if (!includeOverdue && displayDate < todayStart) continue;

                const dateStr = formatLocalDate(displayDate);

                // Skip if this date is in the skippedDates list
                if (skippedDates.includes(dateStr)) continue;

                const isCompleted = completedDates.includes(dateStr);

                if (displayDate >= todayStart && displayDate <= endDate) {
                    expanded.push({
                        ...item,
                        displayDate,
                        isVirtualOccurrence: weekOffset > 0,
                        isCompleted,
                    });
                }
            }
            return;
        }

        // Monthly repeat: generate all monthly occurrences within the date range
        if (item.repeat === 'monthly' && safeEffectiveDate) {
            const baseDate = new Date(safeEffectiveDate);
            const completedDates: string[] = item.completedDates
                ? JSON.parse(item.completedDates)
                : [];
            const skippedDates: string[] = item.skippedDates
                ? JSON.parse(item.skippedDates)
                : [];

            const endDate = new Date(now);
            endDate.setDate(endDate.getDate() + daysToExpand);

            const createdAt = new Date(item.createdAt);

            // Generate monthly occurrences - calculate how many months ahead we need
            const monthsToGenerate = Math.ceil(daysToExpand / 30) + 1;

            for (let monthOffset = 0; monthOffset <= monthsToGenerate; monthOffset++) {
                const displayDate = new Date(baseDate);
                displayDate.setMonth(displayDate.getMonth() + monthOffset);

                // Skip if before creation time
                if (displayDate < createdAt) continue;

                // Skip if before now (unless includeOverdue is true)
                const todayStart = new Date(now);
                todayStart.setHours(0, 0, 0, 0);
                if (!includeOverdue && displayDate < todayStart) continue;

                const dateStr = formatLocalDate(displayDate);

                // Skip if this date is in the skippedDates list
                if (skippedDates.includes(dateStr)) continue;

                const isCompleted = completedDates.includes(dateStr);

                if (displayDate >= todayStart && displayDate <= endDate) {
                    expanded.push({
                        ...item,
                        displayDate,
                        isVirtualOccurrence: monthOffset > 0,
                        isCompleted,
                    });
                }
            }
            return;
        }

        // Yearly repeat
        if (item.repeat === 'yearly' && safeEffectiveDate) {
            const baseDate = new Date(safeEffectiveDate);
            const completedDates: string[] = item.completedDates
                ? JSON.parse(item.completedDates)
                : [];

            // Check current year and next year
            for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
                const displayDate = new Date(baseDate);
                displayDate.setFullYear(displayDate.getFullYear() + yearOffset);

                const endDate = new Date(now);
                endDate.setDate(endDate.getDate() + daysToExpand);

                const dateStr = formatLocalDate(displayDate);
                const isCompleted = completedDates.includes(dateStr);

                if (displayDate > now && displayDate <= endDate) {
                    expanded.push({
                        ...item,
                        displayDate,
                        isVirtualOccurrence: yearOffset > 0,
                        isCompleted,
                    });
                }
            }
            return;
        }

        // Non-repeating or other repeat types: just add if within range
        if (safeEffectiveDate) {
            const itemDate = new Date(safeEffectiveDate);
            const endDate = new Date(now);
            endDate.setDate(endDate.getDate() + daysToExpand);

            // Include both future items AND past items (for today's completed tasks)
            // One-time tasks with status='done' should show as completed
            const isCompleted = item.status === 'done';

            // Include today's items even if time has passed, so completed tasks show
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);

            // Only include items within the display window (today onwards)
            // One-time tasks from the past (completed or not) should not show in Upcoming
            // They belong in the past/history view
            if (itemDate >= todayStart && itemDate <= endDate) {
                expanded.push({
                    ...item,
                    displayDate: itemDate,
                    isVirtualOccurrence: false,
                    isCompleted,
                });
            }
        }
    });

    return expanded;
}

/**
 * Get overdue items (from a PREVIOUS day, not yet completed)
 * Items from today are NOT overdue, even if the time has passed.
 * Overdue means a whole day has passed without completing the task.
 * 
 * IMPORTANT: An item is overdue based on its DUE DATE, not reminder date.
 * If dueAt is in the future, the item is NOT overdue even if remindAt has passed.
 */
export function getOverdueItems(items: Item[]): ExpandedItem[] {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0); // Start of today

    return items
        .filter(item => {
            if (item.status !== 'active') return false;
            // Skip repeating items - they're handled by expansion
            if (item.repeat && item.repeat !== 'none') return false;

            // For overdue calculation, use ONLY dueAt
            // If no dueAt, the item cannot be "overdue" (reminders don't make things overdue)
            if (!item.dueAt) return false;

            const dueDate = new Date(safeIsoDate(item.dueAt));
            // Overdue = item's DUE date is BEFORE today (previous day)
            return dueDate < todayStart;
        })
        .map(item => ({
            ...item,
            displayDate: new Date(safeIsoDate(item.dueAt!)),
            isVirtualOccurrence: false,
        }));
}

/**
 * Get overdue occurrences for repeating items (yesterday's uncompleted occurrences)
 * Only shows occurrences that SHOULD have happened on a past day based on the repeat pattern.
 * @param items - Array of items to check
 */
export function getOverdueOccurrences(items: Item[]): ExpandedItem[] {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Check up to 365 days back - overdue items persist indefinitely until skipped/completed
    const checkDays = 365;

    const overdue: ExpandedItem[] = [];

    // Helper to safely parse potentially double-escaped JSON
    const safeParseJson = (str: string | null | undefined): string[] => {
        if (!str) return [];
        try {
            let parsed = JSON.parse(str);
            // Handle double-escaped JSON like: "\"[\\\"2025-12-30\\\"]\""
            if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    items.forEach(item => {
        if (item.status !== 'active') return;
        if (!item.repeat || item.repeat === 'none') return;
        // Require dueAt for overdue check (remindAt doesn't make something overdue)
        if (!item.dueAt) return;

        const baseDueDate = new Date(safeIsoDate(item.dueAt));
        const createdAt = new Date(item.createdAt);

        // Parse skipped and completed dates with robust parsing
        const skippedDates = safeParseJson(item.skippedDates);
        const completedDates = safeParseJson(item.completedDates);

        // For each past day, check if an occurrence was due that day
        for (let i = 1; i <= checkDays; i++) {
            const pastDate = new Date(now);
            pastDate.setDate(pastDate.getDate() - i);
            const pastDateStr = formatLocalDate(pastDate);

            // Skip if date is skipped or completed
            if (skippedDates.includes(pastDateStr)) continue;
            if (completedDates.includes(pastDateStr)) continue;

            // Check if an occurrence ACTUALLY falls on this past day based on the repeat pattern
            let occurrenceOnThisDay = false;

            if (item.repeat === 'daily') {
                // Daily: occurs every day after creation
                const pastOccurrence = new Date(pastDate);
                pastOccurrence.setHours(baseDueDate.getHours(), baseDueDate.getMinutes(), 0, 0);
                occurrenceOnThisDay = pastOccurrence >= createdAt;
            } else if (item.repeat === 'weekly') {
                // Weekly: occurs on the same day of week as the base due date
                if (pastDate.getDay() === baseDueDate.getDay()) {
                    const pastOccurrence = new Date(pastDate);
                    pastOccurrence.setHours(baseDueDate.getHours(), baseDueDate.getMinutes(), 0, 0);
                    occurrenceOnThisDay = pastOccurrence >= createdAt;
                }
            } else if (item.repeat === 'monthly') {
                // Monthly: occurs on the same day of month as the base due date
                if (pastDate.getDate() === baseDueDate.getDate()) {
                    const pastOccurrence = new Date(pastDate);
                    pastOccurrence.setHours(baseDueDate.getHours(), baseDueDate.getMinutes(), 0, 0);
                    occurrenceOnThisDay = pastOccurrence >= createdAt;
                }
            } else if (item.repeat === 'yearly') {
                // Yearly: occurs on the same month and day
                if (pastDate.getMonth() === baseDueDate.getMonth() &&
                    pastDate.getDate() === baseDueDate.getDate()) {
                    const pastOccurrence = new Date(pastDate);
                    pastOccurrence.setHours(baseDueDate.getHours(), baseDueDate.getMinutes(), 0, 0);
                    occurrenceOnThisDay = pastOccurrence >= createdAt;
                }
            }

            if (occurrenceOnThisDay) {
                const pastOccurrence = new Date(pastDate);
                pastOccurrence.setHours(baseDueDate.getHours(), baseDueDate.getMinutes(), 0, 0);

                overdue.push({
                    ...item,
                    displayDate: pastOccurrence,
                    isVirtualOccurrence: true,
                });
            }
        }
    });

    // Sort by date (oldest first)
    return overdue.sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime());
}

/**
 * Filter expanded items by a specific date
 */
export function filterByDate(items: ExpandedItem[], targetDate: Date): ExpandedItem[] {
    const targetDateString = targetDate.toDateString();
    return items.filter(item => item.displayDate.toDateString() === targetDateString);
}

/**
 * Sort items: active first (by time), then done items at the end
 */
export function sortItemsByTimeAndStatus(items: ExpandedItem[]): ExpandedItem[] {
    return [...items].sort((a, b) => {
        // Done items go to end
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        // Sort by time
        return a.displayDate.getTime() - b.displayDate.getTime();
    });
}
