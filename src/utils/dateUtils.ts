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

/**
 * Sanitize a date string to ensure it is valid ISO 8601
 * Replaces Postgres space separator (' ') with 'T'
 */
export const safeIsoDate = (dateStr: string): string => {
    if (!dateStr) return dateStr;
    // Replace space with T
    let iso = dateStr.replace(' ', 'T');

    // Normalize Postgres +00 offset to +00:00 (or Z) if purely +00
    // Regex looks for +00 at end of string that doesn't have :00
    if (iso.endsWith('+00')) {
        iso = iso.replace(/\+00$/, '+00:00');
    }
    return iso;
};

/**
 * Parse a date string safely, handling Postgres formatting
 */
export const safeParseDate = (dateStr: string): Date => {
    return new Date(safeIsoDate(dateStr));
};
