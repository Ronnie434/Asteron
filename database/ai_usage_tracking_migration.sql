-- ============================================================================
-- AI Usage Tracking Migration
-- ============================================================================
-- Purpose: Track OpenRouter API usage (tokens, costs) per user for analytics
-- and billing purposes.
--
-- This migration creates:
-- 1. ai_usage_logs - Individual API call logs
-- 2. ai_usage_daily_summary - Daily aggregated usage per user
-- 3. ai_usage_monthly_summary - Monthly aggregated usage per user
-- 4. Indexes for performance optimization
-- 5. Row Level Security (RLS) policies
-- 6. Helper function for updating daily summaries
--
-- Based on: USAGE_TRACKING_PLAN.md
-- ============================================================================

-- ============================================================================
-- 1. MAIN USAGE LOGS TABLE
-- ============================================================================
-- Stores individual API call usage data from OpenRouter
-- Each row represents one API request/response cycle

CREATE TABLE IF NOT EXISTS ai_usage_logs (
    -- Primary key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- User identification
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Model and operation information
    model_id TEXT NOT NULL,                    -- e.g., 'google/gemini-2.0-flash-lite-001'
    operation_type TEXT NOT NULL,              -- 'chat', 'quick_capture', 'list_generation', 'voice_transcription'
    
    -- Token counts (from OpenRouter API response)
    prompt_tokens INTEGER DEFAULT 0 NOT NULL,
    completion_tokens INTEGER DEFAULT 0 NOT NULL,
    total_tokens INTEGER DEFAULT 0 NOT NULL,
    cached_tokens INTEGER DEFAULT 0,           -- Tokens read from cache (cost savings)
    
    -- Cost tracking (OpenRouter provides cost directly in API response)
    -- Using DECIMAL(12,8) to handle high precision from OpenRouter
    -- Example: 0.00000095 USD
    cost_usd DECIMAL(12, 8) DEFAULT 0 NOT NULL,
    
    -- Performance tracking
    response_time_ms INTEGER,                  -- API response latency in milliseconds
    
    -- Success/error tracking
    success BOOLEAN DEFAULT true NOT NULL,
    error_message TEXT,                        -- Error details if success = false
    
    -- Additional metadata (flexible JSONB for future extensions)
    metadata JSONB,
    
    -- Constraints
    CONSTRAINT valid_tokens CHECK (
        prompt_tokens >= 0 AND 
        completion_tokens >= 0 AND 
        total_tokens >= 0 AND
        cached_tokens >= 0
    ),
    CONSTRAINT valid_cost CHECK (cost_usd >= 0)
);

-- Add comment to table
COMMENT ON TABLE ai_usage_logs IS 'Individual OpenRouter API call usage logs for tracking tokens and costs per user';

-- Add comments to important columns
COMMENT ON COLUMN ai_usage_logs.cost_usd IS 'Cost in USD directly from OpenRouter API response (high precision)';
COMMENT ON COLUMN ai_usage_logs.cached_tokens IS 'Number of tokens read from cache - reduces costs';
COMMENT ON COLUMN ai_usage_logs.operation_type IS 'Type of operation: chat, quick_capture, list_generation, voice_transcription';

-- ============================================================================
-- 2. DAILY AGGREGATION TABLE
-- ============================================================================
-- Pre-aggregated daily usage for faster dashboard queries and analytics

CREATE TABLE IF NOT EXISTS ai_usage_daily_summary (
    -- Primary key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- User and date
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Aggregated counts
    total_requests INTEGER DEFAULT 0 NOT NULL,
    total_prompt_tokens INTEGER DEFAULT 0 NOT NULL,
    total_completion_tokens INTEGER DEFAULT 0 NOT NULL,
    total_tokens INTEGER DEFAULT 0 NOT NULL,
    total_cost_usd DECIMAL(12, 8) DEFAULT 0 NOT NULL,
    
    -- Success/failure tracking
    successful_requests INTEGER DEFAULT 0 NOT NULL,
    failed_requests INTEGER DEFAULT 0 NOT NULL,
    
    -- Performance metrics
    avg_response_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Unique constraint for upsert operations
    UNIQUE(user_id, date)
);

-- Add comment to table
COMMENT ON TABLE ai_usage_daily_summary IS 'Daily aggregated AI usage statistics per user for fast analytics queries';

-- ============================================================================
-- 3. MONTHLY AGGREGATION TABLE
-- ============================================================================
-- Monthly rollups for billing and long-term analytics

CREATE TABLE IF NOT EXISTS ai_usage_monthly_summary (
    -- Primary key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- User and month (stored as first day of month)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month DATE NOT NULL,                       -- First day of month (e.g., '2024-01-01')
    
    -- Aggregated totals
    total_requests INTEGER DEFAULT 0 NOT NULL,
    total_prompt_tokens INTEGER DEFAULT 0 NOT NULL,
    total_completion_tokens INTEGER DEFAULT 0 NOT NULL,
    total_tokens INTEGER DEFAULT 0 NOT NULL,
    total_cost_usd DECIMAL(12, 8) DEFAULT 0 NOT NULL,
    
    -- Success/failure tracking
    successful_requests INTEGER DEFAULT 0 NOT NULL,
    failed_requests INTEGER DEFAULT 0 NOT NULL,
    
    -- Performance metrics
    avg_response_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Unique constraint for upsert operations
    UNIQUE(user_id, month)
);

-- Add comment to table
COMMENT ON TABLE ai_usage_monthly_summary IS 'Monthly aggregated AI usage statistics per user for billing and long-term analytics';

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================

-- ai_usage_logs indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created 
    ON ai_usage_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_operation_type 
    ON ai_usage_logs(operation_type);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at 
    ON ai_usage_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_success 
    ON ai_usage_logs(success) 
    WHERE success = false;  -- Partial index for failed requests

-- ai_usage_daily_summary indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_user_date 
    ON ai_usage_daily_summary(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_date 
    ON ai_usage_daily_summary(date DESC);

-- ai_usage_monthly_summary indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_monthly_user_month 
    ON ai_usage_monthly_summary(user_id, month DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_monthly_month 
    ON ai_usage_monthly_summary(month DESC);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_monthly_summary ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for ai_usage_logs
-- ============================================================================

-- Policy: Users can only SELECT their own usage logs
DROP POLICY IF EXISTS "Users can view their own usage logs" ON ai_usage_logs;
CREATE POLICY "Users can view their own usage logs"
    ON ai_usage_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Authenticated users can INSERT their own usage logs
-- Service role bypasses RLS, so backend can insert for any user
DROP POLICY IF EXISTS "Users can insert their own usage logs" ON ai_usage_logs;
CREATE POLICY "Users can insert their own usage logs"
    ON ai_usage_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can do everything (for aggregation functions)
-- Note: This is implicit - service_role bypasses RLS by default

-- ============================================================================
-- RLS Policies for ai_usage_daily_summary
-- ============================================================================

-- Policy: Users can only SELECT their own daily summaries
DROP POLICY IF EXISTS "Users can view their own daily summaries" ON ai_usage_daily_summary;
CREATE POLICY "Users can view their own daily summaries"
    ON ai_usage_daily_summary
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Only service role can INSERT/UPDATE daily summaries
-- (Regular users should not modify aggregated data)
-- Service role bypasses RLS, so no explicit INSERT policy needed

-- ============================================================================
-- RLS Policies for ai_usage_monthly_summary
-- ============================================================================

-- Policy: Users can only SELECT their own monthly summaries
DROP POLICY IF EXISTS "Users can view their own monthly summaries" ON ai_usage_monthly_summary;
CREATE POLICY "Users can view their own monthly summaries"
    ON ai_usage_monthly_summary
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Only service role can INSERT/UPDATE monthly summaries
-- Service role bypasses RLS, so no explicit INSERT policy needed

-- ============================================================================
-- 6. HELPER FUNCTION: UPDATE DAILY SUMMARY
-- ============================================================================
-- This function updates the daily summary after a new usage log is inserted
-- Can be called manually or via trigger

CREATE OR REPLACE FUNCTION update_daily_usage_summary(
    p_user_id UUID,
    p_date DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with function owner's privileges (bypasses RLS)
AS $$
DECLARE
    v_total_requests INTEGER;
    v_total_prompt_tokens INTEGER;
    v_total_completion_tokens INTEGER;
    v_total_tokens INTEGER;
    v_total_cost_usd DECIMAL(12, 8);
    v_successful_requests INTEGER;
    v_failed_requests INTEGER;
    v_avg_response_time_ms INTEGER;
BEGIN
    -- Aggregate data for the specified user and date
    SELECT 
        COUNT(*),
        COALESCE(SUM(prompt_tokens), 0),
        COALESCE(SUM(completion_tokens), 0),
        COALESCE(SUM(total_tokens), 0),
        COALESCE(SUM(cost_usd), 0),
        COUNT(*) FILTER (WHERE success = true),
        COUNT(*) FILTER (WHERE success = false),
        COALESCE(AVG(response_time_ms)::INTEGER, 0)
    INTO
        v_total_requests,
        v_total_prompt_tokens,
        v_total_completion_tokens,
        v_total_tokens,
        v_total_cost_usd,
        v_successful_requests,
        v_failed_requests,
        v_avg_response_time_ms
    FROM ai_usage_logs
    WHERE user_id = p_user_id
        AND DATE(created_at) = p_date;
    
    -- Upsert into daily summary
    INSERT INTO ai_usage_daily_summary (
        user_id,
        date,
        total_requests,
        total_prompt_tokens,
        total_completion_tokens,
        total_tokens,
        total_cost_usd,
        successful_requests,
        failed_requests,
        avg_response_time_ms,
        updated_at
    ) VALUES (
        p_user_id,
        p_date,
        v_total_requests,
        v_total_prompt_tokens,
        v_total_completion_tokens,
        v_total_tokens,
        v_total_cost_usd,
        v_successful_requests,
        v_failed_requests,
        v_avg_response_time_ms,
        NOW()
    )
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        total_requests = EXCLUDED.total_requests,
        total_prompt_tokens = EXCLUDED.total_prompt_tokens,
        total_completion_tokens = EXCLUDED.total_completion_tokens,
        total_tokens = EXCLUDED.total_tokens,
        total_cost_usd = EXCLUDED.total_cost_usd,
        successful_requests = EXCLUDED.successful_requests,
        failed_requests = EXCLUDED.failed_requests,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms,
        updated_at = NOW();
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION update_daily_usage_summary IS 'Aggregates usage logs for a specific user and date into the daily summary table';

-- ============================================================================
-- 7. HELPER FUNCTION: UPDATE MONTHLY SUMMARY
-- ============================================================================
-- This function updates the monthly summary based on daily summaries

CREATE OR REPLACE FUNCTION update_monthly_usage_summary(
    p_user_id UUID,
    p_month DATE  -- First day of month
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_requests INTEGER;
    v_total_prompt_tokens INTEGER;
    v_total_completion_tokens INTEGER;
    v_total_tokens INTEGER;
    v_total_cost_usd DECIMAL(12, 8);
    v_successful_requests INTEGER;
    v_failed_requests INTEGER;
    v_avg_response_time_ms INTEGER;
BEGIN
    -- Aggregate daily summaries for the month
    SELECT 
        COALESCE(SUM(total_requests), 0),
        COALESCE(SUM(total_prompt_tokens), 0),
        COALESCE(SUM(total_completion_tokens), 0),
        COALESCE(SUM(total_tokens), 0),
        COALESCE(SUM(total_cost_usd), 0),
        COALESCE(SUM(successful_requests), 0),
        COALESCE(SUM(failed_requests), 0),
        COALESCE(AVG(avg_response_time_ms)::INTEGER, 0)
    INTO
        v_total_requests,
        v_total_prompt_tokens,
        v_total_completion_tokens,
        v_total_tokens,
        v_total_cost_usd,
        v_successful_requests,
        v_failed_requests,
        v_avg_response_time_ms
    FROM ai_usage_daily_summary
    WHERE user_id = p_user_id
        AND date >= p_month
        AND date < (p_month + INTERVAL '1 month')::DATE;
    
    -- Upsert into monthly summary
    INSERT INTO ai_usage_monthly_summary (
        user_id,
        month,
        total_requests,
        total_prompt_tokens,
        total_completion_tokens,
        total_tokens,
        total_cost_usd,
        successful_requests,
        failed_requests,
        avg_response_time_ms,
        updated_at
    ) VALUES (
        p_user_id,
        p_month,
        v_total_requests,
        v_total_prompt_tokens,
        v_total_completion_tokens,
        v_total_tokens,
        v_total_cost_usd,
        v_successful_requests,
        v_failed_requests,
        v_avg_response_time_ms,
        NOW()
    )
    ON CONFLICT (user_id, month)
    DO UPDATE SET
        total_requests = EXCLUDED.total_requests,
        total_prompt_tokens = EXCLUDED.total_prompt_tokens,
        total_completion_tokens = EXCLUDED.total_completion_tokens,
        total_tokens = EXCLUDED.total_tokens,
        total_cost_usd = EXCLUDED.total_cost_usd,
        successful_requests = EXCLUDED.successful_requests,
        failed_requests = EXCLUDED.failed_requests,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms,
        updated_at = NOW();
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION update_monthly_usage_summary IS 'Aggregates daily summaries for a specific user and month into the monthly summary table';

-- ============================================================================
-- 8. VERIFICATION QUERIES (Optional - for testing)
-- ============================================================================
-- Uncomment these to verify the migration was successful

-- Check tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name LIKE 'ai_usage%';

-- Check indexes exist
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename LIKE 'ai_usage%';

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE tablename LIKE 'ai_usage%';

-- Check policies exist
-- SELECT tablename, policyname FROM pg_policies 
-- WHERE tablename LIKE 'ai_usage%';

-- ============================================================================
-- 9. AUTOMATIC SUMMARY UPDATE TRIGGER
-- ============================================================================
-- This trigger automatically updates daily and monthly summaries when a new
-- usage log is inserted, ensuring summary tables are always up-to-date

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_update_usage_summaries ON ai_usage_logs;

-- Drop function if it exists (for idempotency)
DROP FUNCTION IF EXISTS trigger_update_usage_summaries_fn();

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_update_usage_summaries_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with function owner's privileges (bypasses RLS)
AS $$
BEGIN
    -- Update daily summary for the new log entry
    PERFORM update_daily_usage_summary(
        NEW.user_id,
        DATE(NEW.created_at)
    );
    
    -- Update monthly summary for the new log entry
    PERFORM update_monthly_usage_summary(
        NEW.user_id,
        date_trunc('month', NEW.created_at)::DATE
    );
    
    RETURN NEW;
END;
$$;

-- Add comment to trigger function
COMMENT ON FUNCTION trigger_update_usage_summaries_fn IS 'Trigger function that automatically updates daily and monthly summaries when a new usage log is inserted';

-- Create trigger that fires after INSERT on ai_usage_logs
CREATE TRIGGER trigger_update_usage_summaries
    AFTER INSERT ON ai_usage_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_usage_summaries_fn();

-- Add comment to trigger
COMMENT ON TRIGGER trigger_update_usage_summaries ON ai_usage_logs IS 'Automatically updates daily and monthly usage summaries after each new usage log insertion';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run this migration in your Supabase SQL Editor
-- 2. Verify tables, indexes, policies, and triggers were created
-- 3. Update aiService.ts to enable usage tracking (add "usage": { "include": true })
-- 4. Create usageTrackingService.ts to log usage data
-- 5. Summary tables will now be automatically populated via trigger
-- ============================================================================