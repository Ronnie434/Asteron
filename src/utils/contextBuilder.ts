import type { Item, RepeatFrequency } from '../db/items';
import { expandRepeatingItems } from './repeatExpansion';
import { formatLocalDate } from './dateUtils';

/**
 * Generates a token-efficient context for the AI that covers 365 days
 * by expanding all items (including repeating) and grouping by month.
 */
export function generateSmartContext(items: Item[]): {
    repeatingContext: string;
    expandedContext: string;
    overdueContext: string;
    billsContext: string;
} {
    const activeItems = items.filter(i => i.status !== 'archived');

    // Get repeating item patterns for reference
    const repeatingItems = activeItems.filter(i => i.repeat && i.repeat !== 'none');
    const repeatingContext = summarizeRepeatingItems(repeatingItems);

    // Expand ALL items for 365 days and group by month
    const expandedItems = expandRepeatingItems(activeItems, 365);
    const expandedContext = formatItemsByMonth(expandedItems);

    // Get overdue items
    const now = new Date();
    const overdueItems = activeItems.filter(i => {
        if (i.status === 'done' || !i.dueAt) return false;
        return new Date(i.dueAt) < now;
    });
    const overdueContext = formatOverdueItems(overdueItems);

    // Get recurring bills summary
    const recurringBills = activeItems.filter(i =>
        i.type === 'bill' && i.repeat && i.repeat !== 'none' && i.status === 'active'
    );
    const billsContext = formatBillsSummary(recurringBills);

    return {
        repeatingContext,
        expandedContext,
        overdueContext,
        billsContext,
    };
}

/**
 * Formats expanded items grouped by month for efficient context.
 * Shows full detail for current month, summary counts for future months.
 */
function formatItemsByMonth(expandedItems: ReturnType<typeof expandRepeatingItems>): string {
    if (expandedItems.length === 0) return '';

    // Sort by date
    const sorted = [...expandedItems].sort((a, b) => {
        const dateA = a.displayDate instanceof Date ? a.displayDate : new Date(a.displayDate);
        const dateB = b.displayDate instanceof Date ? b.displayDate : new Date(b.displayDate);
        return dateA.getTime() - dateB.getTime();
    });

    // Group by month
    const byMonth = new Map<string, typeof sorted>();
    for (const item of sorted) {
        const displayDate = item.displayDate instanceof Date
            ? item.displayDate
            : new Date(item.displayDate);
        const monthKey = `${displayDate.getFullYear()}-${String(displayDate.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth.has(monthKey)) {
            byMonth.set(monthKey, []);
        }
        byMonth.get(monthKey)!.push(item);
    }

    const sections: string[] = [];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (const [monthKey, monthItems] of byMonth) {
        const [year, month] = monthKey.split('-');
        const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // For current and next month: show full detail
        // For future months: show full detail but grouped
        const lines: string[] = [];

        for (const item of monthItems) {
            const displayDate = item.displayDate instanceof Date
                ? item.displayDate
                : new Date(item.displayDate);

            const isoDate = formatLocalDate(displayDate);
            const dayStr = displayDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
            });
            const timeStr = formatTimeFromDate(item.remindAt || item.dueAt);
            const priorityLabel = item.priority === 'high' ? ' ⚠️' : '';
            const typeLabel = item.type !== 'task' ? ` [${item.type}]` : '';

            lines.push(`  - [${isoDate}] ${dayStr}${timeStr}: ${item.title}${typeLabel}${priorityLabel}`);
        }

        sections.push(`**${monthName}** (${monthItems.length} items):\n${lines.join('\n')}`);
    }

    return `SCHEDULE BY MONTH:\n${sections.join('\n\n')}`;
}

/**
 * Summarizes repeating items by their pattern for quick reference.
 */
function summarizeRepeatingItems(items: Item[]): string {
    if (items.length === 0) return '';

    const lines: string[] = [];

    for (const item of items) {
        const repeatPattern = formatRepeatPattern(item.repeat!, item.repeatConfig);
        const timeStr = formatTimeFromDate(item.remindAt || item.dueAt);
        const typeLabel = item.type !== 'task' ? ` [${item.type}]` : '';

        lines.push(`- ${item.title} (${repeatPattern}${timeStr})${typeLabel}`);
    }

    return lines.length > 0
        ? `REPEATING PATTERNS:\n${lines.join('\n')}`
        : '';
}

/**
 * Formats the repeat pattern in a human-readable way
 */
function formatRepeatPattern(repeat: RepeatFrequency, repeatConfig?: string | null): string {
    switch (repeat) {
        case 'daily':
            return 'Daily';
        case 'weekly':
            if (repeatConfig) {
                try {
                    const config = JSON.parse(repeatConfig);
                    if (config.days && Array.isArray(config.days)) {
                        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        const days = config.days.map((d: number) => dayNames[d]).join(', ');
                        return `Weekly on ${days}`;
                    }
                } catch { }
            }
            return 'Weekly';
        case 'monthly':
            if (repeatConfig) {
                try {
                    const config = JSON.parse(repeatConfig);
                    if (config.dayOfMonth) {
                        return `Monthly on the ${ordinal(config.dayOfMonth)}`;
                    }
                } catch { }
            }
            return 'Monthly';
        case 'yearly':
            return 'Yearly';
        default:
            return repeat;
    }
}

/**
 * Formats time from an ISO date string
 */
function formatTimeFromDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // Skip if it's midnight (likely no specific time set)
    if (hours === 0 && minutes === 0) return '';

    return ` at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

/**
 * Formats one-time items with their dates
 */
function formatOneTimeItems(expandedItems: ReturnType<typeof expandRepeatingItems>): string {
    if (expandedItems.length === 0) return '';

    // Sort by date
    const sorted = [...expandedItems].sort((a, b) => {
        const dateA = a.displayDate instanceof Date ? a.displayDate : new Date(a.displayDate);
        const dateB = b.displayDate instanceof Date ? b.displayDate : new Date(b.displayDate);
        return dateA.getTime() - dateB.getTime();
    });

    const lines: string[] = [];

    for (const item of sorted) {
        const displayDate = item.displayDate instanceof Date
            ? item.displayDate
            : new Date(item.displayDate);

        const dateStr = displayDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });

        const isoDate = formatLocalDate(displayDate);
        const timeStr = formatTimeFromDate(item.displayDate?.toString());
        const priorityLabel = item.priority === 'high' ? ' ⚠️' : '';

        lines.push(`- [${isoDate}] ${dateStr}${timeStr}: ${item.title}${priorityLabel}`);
    }

    return lines.length > 0
        ? `ONE-TIME ITEMS (Next 60 days):\n${lines.join('\n')}`
        : '';
}

/**
 * Formats overdue items
 */
function formatOverdueItems(items: Item[]): string {
    if (items.length === 0) return '';

    const lines = items.map(i => {
        const dueDate = new Date(i.dueAt!).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
        return `- ${i.title} (Due: ${dueDate}) ⚠️ OVERDUE`;
    });

    return `OVERDUE ITEMS (Needs Attention):\n${lines.join('\n')}`;
}

/**
 * Formats recurring bills summary
 */
function formatBillsSummary(bills: Item[]): string {
    if (bills.length === 0) return '';

    const lines = bills.map(b => {
        const repeatPattern = formatRepeatPattern(b.repeat!, b.repeatConfig);
        return `- ${b.title} (${repeatPattern})`;
    });

    return `RECURRING BILLS:\n${lines.join('\n')}`;
}

/**
 * Helper to get ordinal suffix for a number
 */
function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Builds the full context string for the AI
 */
export function buildFullContext(items: Item[]): string {
    const { repeatingContext, expandedContext, overdueContext, billsContext } =
        generateSmartContext(items);

    const sections = [
        overdueContext,
        billsContext,
        repeatingContext,
        expandedContext,
    ].filter(s => s.length > 0);

    return sections.join('\n\n');
}
