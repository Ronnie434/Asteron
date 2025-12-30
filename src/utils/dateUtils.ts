/**
 * Date utilities with consistent local timezone handling
 * Avoids UTC conversion issues that can cause date shifts
 */

/**
 * Format a date as YYYY-MM-DD using local timezone
 * (toISOString() converts to UTC which can shift the date)
 */
export const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Get today's date as YYYY-MM-DD in local timezone
 */
export const getTodayLocalDate = (): string => {
    return formatLocalDate(new Date());
};

/**
 * Parse a date string and return a Date object
 * Handles ISO strings safely
 */
export const parseDate = (dateString: string): Date => {
    return new Date(dateString);
};

/**
 * Get start of today (00:00:00) in local timezone
 */
export const getStartOfToday = (): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

/**
 * Get end of today (23:59:59) in local timezone
 */
export const getEndOfToday = (): Date => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
};
