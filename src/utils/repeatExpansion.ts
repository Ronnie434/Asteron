import type { Item, RepeatFrequency, CustomRepeatConfig } from '../db/items';
import { formatLocalDate as formatLocalDateUtil } from './dateUtils';

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

/**
 * Format a date as YYYY-MM-DD using local timezone
 * (toISOString() converts to UTC which can shift the date)
 * @deprecated Use formatLocalDate from dateUtils instead
 */
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
                if (effectiveDate) {
                    const originalDate = new Date(effectiveDate);
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
        if (item.repeat === 'weekly' && effectiveDate) {
            const baseDate = new Date(effectiveDate);
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
        if (item.repeat === 'monthly' && effectiveDate) {
            const baseDate = new Date(effectiveDate);
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
        if (item.repeat === 'yearly' && effectiveDate) {
            const baseDate = new Date(effectiveDate);
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
        if (effectiveDate) {
            const itemDate = new Date(effectiveDate);
            const endDate = new Date(now);
            endDate.setDate(endDate.getDate() + daysToExpand);

            // Include both future items AND past items (for today's completed tasks)
            // One-time tasks with status='done' should show as completed
            const isCompleted = item.status === 'done';

            // Include today's items even if time has passed, so completed tasks show
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);

            if ((itemDate >= todayStart && itemDate <= endDate) || isCompleted) {
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
            const effectiveDate = getEffectiveDate(item);
            if (!effectiveDate) return false;
            // Overdue = item's date is BEFORE today (previous day)
            return new Date(effectiveDate) < todayStart;
        })
        .map(item => ({
            ...item,
            displayDate: new Date(getEffectiveDate(item)!),
            isVirtualOccurrence: false,
        }));
}

/**
 * Get overdue occurrences for repeating items (yesterday's uncompleted occurrences)
 * @param items - Array of items to check
 */
export function getOverdueOccurrences(items: Item[]): ExpandedItem[] {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check up to 3 days back for overdue items, not just yesterday
    // This makes it more robust if user doesn't open app for a day
    const checkDays = 3;

    const overdue: ExpandedItem[] = [];

    items.forEach(item => {
        if (item.status !== 'active') return;
        if (!item.repeat || item.repeat === 'none') return;

        const effectiveDate = getEffectiveDate(item);
        if (!effectiveDate) return;

        // Parse skipped and completed dates
        const skippedDates: string[] = item.skippedDates
            ? JSON.parse(item.skippedDates)
            : [];

        const completedDates: string[] = item.completedDates
            ? JSON.parse(item.completedDates)
            : [];

        // Check past days
        for (let i = 1; i <= checkDays; i++) {
            const pastDate = new Date(now);
            pastDate.setDate(pastDate.getDate() - i);
            const pastDateStr = formatLocalDate(pastDate);

            // Skip if date is skipped
            if (skippedDates.includes(pastDateStr)) continue;

            // Skip if date is completed
            if (completedDates.includes(pastDateStr)) continue;

            // Check if task was created before this occurrence
            const createdAt = new Date(item.createdAt);
            const baseDate = new Date(effectiveDate);
            const pastOccurrence = new Date(pastDate);
            pastOccurrence.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);

            // If task created after this occurrence time, it's not overdue
            if (createdAt > pastOccurrence) continue;

            // Add as overdue
            overdue.push({
                ...item,
                displayDate: pastOccurrence,
                isVirtualOccurrence: true,
            });
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
