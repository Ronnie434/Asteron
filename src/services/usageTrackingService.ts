import { supabase } from './supabase';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * AI operation types for categorizing API usage
 */
export enum AIOperationType {
    CHAT = 'chat',
    PROCESS_NOTE = 'process_note',
    CATEGORIZE = 'categorize',
    GENERATE_BRIEF = 'generate_brief',
    TRANSCRIBE = 'transcribe',
    EXTRACT_ACTION_ITEMS = 'extract_action_items',
    OTHER = 'other'
}

/**
 * Usage data extracted from OpenRouter API response
 */
export interface OpenRouterUsageData {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number; // In USD
    cachedTokens?: number;
}

/**
 * Parameters for logging a single API usage entry
 */
export interface LogUsageParams {
    userId: string;
    modelId: string;
    operationType: AIOperationType;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd?: number;
    cachedTokens?: number;
    responseTimeMs?: number;
    success?: boolean;
    errorMessage?: string;
    metadata?: Record<string, any>;
}

/**
 * Individual usage log entry matching ai_usage_logs table schema
 */
export interface UsageLogEntry {
    id: string;
    userId: string;
    createdAt: string;
    modelId: string;
    operationType: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedTokens: number;
    costUsd: number;
    responseTimeMs: number | null;
    success: boolean;
    errorMessage: string | null;
    metadata: Record<string, any> | null;
}

/**
 * Aggregated usage summary
 */
export interface UsageSummary {
    totalRequests: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalCostUsd: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTimeMs: number | null;
}

/**
 * Daily usage breakdown
 */
export interface DailyUsage extends UsageSummary {
    date: string; // YYYY-MM-DD
}

/**
 * Monthly usage breakdown
 */
export interface MonthlyUsage extends UsageSummary {
    month: string; // YYYY-MM-DD (first day of month)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extracts usage data from OpenRouter API response
 * 
 * @param response - The OpenRouter API response object
 * @returns Extracted usage data or null if not available
 * 
 * @example
 * ```typescript
 * const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {...});
 * const data = await response.json();
 * const usage = extractUsageFromResponse(data);
 * if (usage) {
 *   await logUsage({ userId, modelId, operationType, ...usage });
 * }
 * ```
 */
export function extractUsageFromResponse(response: any): OpenRouterUsageData | null {
    if (!response || !response.usage) {
        return null;
    }

    const { usage } = response;

    return {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        cost: usage.cost, // May be undefined
        cachedTokens: usage.cached_tokens, // May be undefined
    };
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Logs AI API usage to Supabase (fire-and-forget, non-blocking)
 * 
 * This function logs usage data asynchronously without blocking the caller.
 * Errors are caught and logged but do not propagate to the caller.
 * 
 * @param params - Usage logging parameters
 * 
 * @example
 * ```typescript
 * // After making an OpenRouter API call
 * const usage = extractUsageFromResponse(apiResponse);
 * if (usage && userId) {
 *   logUsage({
 *     userId,
 *     modelId: 'google/gemini-2.0-flash-lite-001',
 *     operationType: AIOperationType.CHAT,
 *     ...usage,
 *     success: true
 *   });
 * }
 * ```
 */
export function logUsage(params: LogUsageParams): void {
    // Fire-and-forget: don't await, handle errors internally
    (async () => {
        try {
            // Skip logging for guest users (no userId)
            if (!params.userId) {
                return;
            }

            const { error } = await supabase
                .from('ai_usage_logs')
                .insert({
                    user_id: params.userId,
                    model_id: params.modelId,
                    operation_type: params.operationType,
                    prompt_tokens: params.promptTokens,
                    completion_tokens: params.completionTokens,
                    total_tokens: params.totalTokens,
                    cached_tokens: params.cachedTokens || 0,
                    cost_usd: params.costUsd || 0,
                    response_time_ms: params.responseTimeMs || null,
                    success: params.success !== false, // Default to true
                    error_message: params.errorMessage || null,
                    metadata: params.metadata || null,
                });

            if (error) {
                console.error('[Usage Tracking] Failed to log usage:', error);
            }
        } catch (err) {
            console.error('[Usage Tracking] Exception while logging usage:', err);
        }
    })().catch((err) => {
        // Extra safety: catch any unhandled promise rejections
        console.error('[Usage Tracking] Unhandled error in logUsage:', err);
    });
}

/**
 * Gets aggregated usage statistics for a user within a date range
 * 
 * @param userId - The user's ID
 * @param startDate - Optional start date (inclusive)
 * @param endDate - Optional end date (inclusive)
 * @returns Aggregated usage summary
 * 
 * @example
 * ```typescript
 * // Get usage for the last 30 days
 * const thirtyDaysAgo = new Date();
 * thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
 * const stats = await getUserUsageStats(userId, thirtyDaysAgo);
 * console.log(`Total cost: $${stats.totalCostUsd.toFixed(4)}`);
 * ```
 */
export async function getUserUsageStats(
    userId: string,
    startDate?: Date,
    endDate?: Date
): Promise<UsageSummary> {
    try {
        let query = supabase
            .from('ai_usage_logs')
            .select('*')
            .eq('user_id', userId);

        if (startDate) {
            query = query.gte('created_at', startDate.toISOString());
        }

        if (endDate) {
            query = query.lte('created_at', endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            console.error('[Usage Tracking] Failed to fetch usage stats:', error);
            throw error;
        }

        // Aggregate the data
        const logs = data || [];
        const summary: UsageSummary = {
            totalRequests: logs.length,
            totalPromptTokens: logs.reduce((sum, log) => sum + (log.prompt_tokens || 0), 0),
            totalCompletionTokens: logs.reduce((sum, log) => sum + (log.completion_tokens || 0), 0),
            totalTokens: logs.reduce((sum, log) => sum + (log.total_tokens || 0), 0),
            totalCostUsd: logs.reduce((sum, log) => sum + (parseFloat(log.cost_usd) || 0), 0),
            successfulRequests: logs.filter(log => log.success).length,
            failedRequests: logs.filter(log => !log.success).length,
            avgResponseTimeMs: logs.length > 0
                ? logs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / logs.length
                : null,
        };

        return summary;
    } catch (err) {
        console.error('[Usage Tracking] Exception in getUserUsageStats:', err);
        throw err;
    }
}

/**
 * Gets daily usage breakdown for a user
 * 
 * @param userId - The user's ID
 * @param days - Number of days to retrieve (default: 30)
 * @returns Array of daily usage summaries, ordered by date descending
 * 
 * @example
 * ```typescript
 * // Get last 7 days of usage
 * const dailyUsage = await getUserDailyUsage(userId, 7);
 * dailyUsage.forEach(day => {
 *   console.log(`${day.date}: ${day.totalRequests} requests, $${day.totalCostUsd.toFixed(4)}`);
 * });
 * ```
 */
export async function getUserDailyUsage(
    userId: string,
    days: number = 30
): Promise<DailyUsage[]> {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('ai_usage_daily_summary')
            .select('*')
            .eq('user_id', userId)
            .gte('date', startDate.toISOString().split('T')[0])
            .order('date', { ascending: false });

        if (error) {
            console.error('[Usage Tracking] Failed to fetch daily usage:', error);
            throw error;
        }

        return (data || []).map(row => ({
            date: row.date,
            totalRequests: row.total_requests || 0,
            totalPromptTokens: row.total_prompt_tokens || 0,
            totalCompletionTokens: row.total_completion_tokens || 0,
            totalTokens: row.total_tokens || 0,
            totalCostUsd: parseFloat(row.total_cost_usd) || 0,
            successfulRequests: row.successful_requests || 0,
            failedRequests: row.failed_requests || 0,
            avgResponseTimeMs: row.avg_response_time_ms || null,
        }));
    } catch (err) {
        console.error('[Usage Tracking] Exception in getUserDailyUsage:', err);
        throw err;
    }
}

/**
 * Gets monthly usage breakdown for a user
 * 
 * @param userId - The user's ID
 * @param months - Number of months to retrieve (default: 12)
 * @returns Array of monthly usage summaries, ordered by month descending
 * 
 * @example
 * ```typescript
 * // Get last 6 months of usage
 * const monthlyUsage = await getUserMonthlyUsage(userId, 6);
 * monthlyUsage.forEach(month => {
 *   console.log(`${month.month}: ${month.totalRequests} requests, $${month.totalCostUsd.toFixed(2)}`);
 * });
 * ```
 */
export async function getUserMonthlyUsage(
    userId: string,
    months: number = 12
): Promise<MonthlyUsage[]> {
    try {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('ai_usage_monthly_summary')
            .select('*')
            .eq('user_id', userId)
            .gte('month', startDate.toISOString().split('T')[0])
            .order('month', { ascending: false });

        if (error) {
            console.error('[Usage Tracking] Failed to fetch monthly usage:', error);
            throw error;
        }

        return (data || []).map(row => ({
            month: row.month,
            totalRequests: row.total_requests || 0,
            totalPromptTokens: row.total_prompt_tokens || 0,
            totalCompletionTokens: row.total_completion_tokens || 0,
            totalTokens: row.total_tokens || 0,
            totalCostUsd: parseFloat(row.total_cost_usd) || 0,
            successfulRequests: row.successful_requests || 0,
            failedRequests: row.failed_requests || 0,
            avgResponseTimeMs: row.avg_response_time_ms || null,
        }));
    } catch (err) {
        console.error('[Usage Tracking] Exception in getUserMonthlyUsage:', err);
        throw err;
    }
}