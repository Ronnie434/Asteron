import type { Item, RepeatFrequency, CustomRepeatConfig } from '../db/items';

/**
 * Expanded item with a computed display date for virtual occurrences
 */
export interface ExpandedItem extends Item {
    displayDate: Date;
    isVirtualOccurrence?: boolean; // True if this is a generated occurrence, not the base item
}

/**
 * Get the effective date from an item (dueAt or remindAt)
 */
export const getEffectiveDate = (item: Item): string | null => {
    return item.dueAt || item.remindAt || null;
};

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
        // Only expand active items
        if (item.status !== 'active') return;

        const effectiveDate = getEffectiveDate(item);

        // Daily repeat: add an entry for each day
        if (item.repeat === 'daily') {
            // Parse skipped dates
            const skippedDates: string[] = item.skippedDates
                ? JSON.parse(item.skippedDates)
                : [];

            for (let dayOffset = 0; dayOffset < daysToExpand; dayOffset++) {
                const displayDate = new Date(now);
                displayDate.setDate(displayDate.getDate() + dayOffset);

                // If item has a time, use that time
                if (effectiveDate) {
                    const originalDate = new Date(effectiveDate);
                    displayDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
                }

                // Skip if this occurrence is in the past (unless including overdue)
                if (!includeOverdue && displayDate <= now) continue;

                // Skip if this date is in the skippedDates list
                const dateStr = displayDate.toISOString().split('T')[0]; // YYYY-MM-DD
                if (skippedDates.includes(dateStr)) continue;

                expanded.push({
                    ...item,
                    displayDate,
                    isVirtualOccurrence: dayOffset > 0,
                });
            }
            return;
        }

        // Weekly repeat: add entries for each week within the range
        if (item.repeat === 'weekly' && effectiveDate) {
            const baseDate = new Date(effectiveDate);
            for (let weekOffset = 0; weekOffset <= Math.ceil(daysToExpand / 7); weekOffset++) {
                const displayDate = new Date(baseDate);
                displayDate.setDate(displayDate.getDate() + (weekOffset * 7));

                const endDate = new Date(now);
                endDate.setDate(endDate.getDate() + daysToExpand);

                if (displayDate > now && displayDate <= endDate) {
                    expanded.push({
                        ...item,
                        displayDate,
                        isVirtualOccurrence: weekOffset > 0,
                    });
                }
            }
            return;
        }

        // Monthly repeat
        if (item.repeat === 'monthly' && effectiveDate) {
            const baseDate = new Date(effectiveDate);
            for (let monthOffset = 0; monthOffset <= 1; monthOffset++) {
                const displayDate = new Date(baseDate);
                displayDate.setMonth(displayDate.getMonth() + monthOffset);

                const endDate = new Date(now);
                endDate.setDate(endDate.getDate() + daysToExpand);

                if (displayDate > now && displayDate <= endDate) {
                    expanded.push({
                        ...item,
                        displayDate,
                        isVirtualOccurrence: monthOffset > 0,
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

            if (itemDate > now && itemDate <= endDate) {
                expanded.push({
                    ...item,
                    displayDate: itemDate,
                    isVirtualOccurrence: false,
                });
            }
        }
    });

    return expanded;
}

/**
 * Get overdue items (date/time has passed, still active)
 */
export function getOverdueItems(items: Item[]): ExpandedItem[] {
    const now = new Date();

    return items
        .filter(item => {
            if (item.status !== 'active') return false;
            const effectiveDate = getEffectiveDate(item);
            if (!effectiveDate) return false;
            return new Date(effectiveDate) < now;
        })
        .map(item => ({
            ...item,
            displayDate: new Date(getEffectiveDate(item)!),
            isVirtualOccurrence: false,
        }));
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
