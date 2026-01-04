# OpenRouter Token/Price Usage Tracking - Implementation Plan

## Executive Summary

This document outlines the architecture and implementation plan for tracking per-user token and cost usage when making calls to the OpenRouter API in the AI Companion app. The solution will store usage data in Supabase for analytics, billing, and monitoring purposes.

---

## 1. OpenRouter API Usage Data Format

> **Source**: [OpenRouter Official Documentation via Context7](https://openrouter.ai/docs)

### 1.1 CRITICAL: Usage Accounting Must Be Explicitly Enabled

⚠️ **The current app does NOT enable usage accounting.** To receive usage data in API responses, you must add `"usage": { "include": true }` to the request body.

**Required Request Format:**
```json
{
  "model": "google/gemini-2.0-flash-lite-001",
  "messages": [...],
  "usage": {
    "include": true
  }
}
```

**Performance Note**: Enabling usage accounting adds 100-300ms to the final response.

### 1.2 Response Format with Usage Accounting Enabled

When `usage.include: true` is set, the response includes detailed usage data:

```json
{
  "id": "gen-xxxxxxxxxxxxxx",
  "object": "chat.completion",
  "model": "google/gemini-2.0-flash-lite-001",
  "choices": [
    {
      "finish_reason": "stop",
      "message": {
        "role": "assistant",
        "content": "..."
      }
    }
  ],
  "usage": {
    "prompt_tokens": 194,
    "completion_tokens": 2,
    "total_tokens": 196,
    "cost": 0.95,
    "cost_details": {
      "upstream_inference_cost": 19
    },
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "audio_tokens": 0
    },
    "completion_tokens_details": {
      "reasoning_tokens": 0
    }
  }
}
```

### 1.3 Key Usage Fields

| Field | Type | Description |
|-------|------|-------------|
| `usage.prompt_tokens` | number | Number of tokens in the prompt (including images and tools) |
| `usage.completion_tokens` | number | Number of tokens generated in the completion |
| `usage.total_tokens` | number | Sum of prompt + completion tokens |
| `usage.cost` | number | **Total cost charged to your account in credits** |
| `usage.cost_details.upstream_inference_cost` | number | Actual cost charged by upstream provider (BYOK only) |
| `usage.prompt_tokens_details.cached_tokens` | number | Tokens read from cache (cost savings) |
| `usage.prompt_tokens_details.audio_tokens` | number | Audio tokens in the prompt |
| `usage.completion_tokens_details.reasoning_tokens` | number | Reasoning tokens (for applicable models) |

### 1.4 Cost Tracking

**OpenRouter provides cost directly in the response** - no need to calculate from token counts!

The `usage.cost` field represents the total amount charged in **OpenRouter credits**. One credit typically equals $0.000001 (one microdollar), but verify against your account settings.

**Important Notes:**
- Token counts use the model's **native tokenizer** for accuracy
- `cached_tokens` represents tokens read from cache (reduce costs)
- Write cache counts are not currently available

### 1.5 Streaming Considerations

For streaming responses (`stream: true`):
- Usage information appears in the **last SSE message** only
- Enable with `"usage": { "include": true }` in the request
- **Current app status**: The app does NOT use streaming (based on code review)

---

## 2. Current App Architecture Analysis

### 2.1 OpenRouter API Call Locations

The app makes OpenRouter API calls in 4 places within `src/ai/aiService.ts`:

| Method | Line | Purpose | Model |
|--------|------|---------|-------|
| `transcribeAudio()` | 609 | Audio transcription | gemini-2.0-flash-lite-001 |
| `analyzeText()` | 829 | Text analysis for item extraction | gemini-2.0-flash-lite-001 |
| `analyzeIntent()` | 1448 | Chat intent analysis | gemini-2.0-flash-lite-001 |
| `processFollowUpAnswer()` | 1572 | Multi-turn conversation | gemini-2.0-flash-lite-001 |

### 2.2 User Identification

User ID is available from `useAuthStore.ts`:
- Authenticated users: `session.user.id` (UUID from Supabase Auth)
- Guest users: `isGuestMode: true` with `guestName` (no persistent ID)

**Decision Point**: Guest users cannot have usage tracked unless we create a device-based ID.

### 2.3 Supabase Integration

Already integrated in `src/services/supabase.ts` with:
- AsyncStorage for session persistence
- Auto-refresh tokens
- Proper React Native configuration

---

## 3. Supabase Database Schema Design

### 3.1 Primary Usage Tracking Table

```sql
-- Table: ai_usage_logs
-- Purpose: Store individual API call usage data
CREATE TABLE ai_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- User identification
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Request identification
    request_id TEXT,                    -- OpenRouter generation ID (gen-xxx)
    session_id UUID,                    -- Optional: group requests by session
    
    -- Model information
    model TEXT NOT NULL,                -- e.g., 'google/gemini-2.0-flash-lite-001'
    operation_type TEXT NOT NULL,       -- 'transcribe' | 'analyze_text' | 'analyze_intent' | 'follow_up'
    
    -- Token counts
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    
    -- Detailed token breakdown (from OpenRouter API)
    cached_tokens INTEGER DEFAULT 0,    -- Tokens read from cache (cost savings)
    audio_tokens INTEGER DEFAULT 0,     -- Audio tokens in prompt
    reasoning_tokens INTEGER DEFAULT 0, -- Reasoning tokens in completion
    
    -- Cost tracking (OpenRouter credits - directly from API response)
    -- OpenRouter credits: 1 credit ≈ $0.000001 (verify with your account)
    cost_credits NUMERIC(12,6) NOT NULL DEFAULT 0,
    
    -- Request metadata
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    response_time_ms INTEGER,           -- API response latency
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Indexes for common queries
    CONSTRAINT valid_tokens CHECK (prompt_tokens >= 0 AND completion_tokens >= 0)
);

-- Indexes
CREATE INDEX idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_user_created ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_usage_logs_operation_type ON ai_usage_logs(operation_type);

-- Enable Row Level Security
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own usage logs"
    ON ai_usage_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage logs"
    ON ai_usage_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

### 3.2 Daily Aggregation Table (Optional - for faster dashboard queries)

```sql
-- Table: ai_usage_daily_summary
-- Purpose: Pre-aggregated daily usage for faster dashboard queries
CREATE TABLE ai_usage_daily_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Aggregated counts
    total_requests INTEGER NOT NULL DEFAULT 0,
    total_prompt_tokens INTEGER NOT NULL DEFAULT 0,
    total_completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost_microdollars INTEGER NOT NULL DEFAULT 0,
    
    -- Breakdown by operation type (JSONB for flexibility)
    operations_breakdown JSONB DEFAULT '{}'::jsonb,
    -- Example: {"transcribe": 5, "analyze_intent": 20, "analyze_text": 3}
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Unique constraint for upsert
    UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX idx_ai_usage_daily_user_date ON ai_usage_daily_summary(user_id, date DESC);

-- Enable RLS
ALTER TABLE ai_usage_daily_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily summary"
    ON ai_usage_daily_summary FOR SELECT
    USING (auth.uid() = user_id);
```

### 3.3 Monthly Aggregation Table (Optional)

```sql
-- Table: ai_usage_monthly_summary
-- Purpose: Monthly rollups for billing and long-term analytics
CREATE TABLE ai_usage_monthly_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year_month TEXT NOT NULL,           -- Format: 'YYYY-MM'
    
    -- Aggregated totals
    total_requests INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost_microdollars INTEGER NOT NULL DEFAULT 0,
    
    -- Peak usage tracking
    peak_daily_tokens INTEGER DEFAULT 0,
    peak_daily_requests INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(user_id, year_month)
);

-- Enable RLS
ALTER TABLE ai_usage_monthly_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own monthly summary"
    ON ai_usage_monthly_summary FOR SELECT
    USING (auth.uid() = user_id);
```

### 3.4 Model Pricing Reference Table (Optional)

> **Note**: Since OpenRouter provides `cost` directly in the API response, a pricing table is **optional** and only needed for:
> - Historical reference
> - Estimating costs before API calls
> - Cross-referencing API-reported costs

```sql
-- Table: ai_model_pricing (OPTIONAL)
-- Purpose: Reference table for model pricing (not required for cost tracking)
CREATE TABLE ai_model_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    model TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL,             -- 'google', 'openai', 'anthropic', etc.
    
    -- Pricing per 1 million tokens (in microdollars)
    input_price_per_million INTEGER NOT NULL,    -- e.g., 75000 = $0.075
    output_price_per_million INTEGER NOT NULL,   -- e.g., 300000 = $0.30
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed initial pricing (for reference only)
INSERT INTO ai_model_pricing (model, provider, input_price_per_million, output_price_per_million)
VALUES ('google/gemini-2.0-flash-lite-001', 'google', 75000, 300000);
```

---

## 4. Implementation Architecture

### 4.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              React Native App                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│  │   Chat Screen    │────▶│   useChatStore   │     │   useAuthStore   │    │
│  │                  │     │                  │     │   (user.id)      │    │
│  └──────────────────┘     └────────┬─────────┘     └────────┬─────────┘    │
│                                    │                         │              │
│                                    ▼                         │              │
│                        ┌──────────────────────┐             │              │
│                        │     aiService.ts     │◀────────────┘              │
│                        │  (OpenRouter calls)  │                             │
│                        └──────────┬───────────┘                             │
│                                   │                                          │
│                                   ▼                                          │
│                        ┌──────────────────────┐                             │
│                        │  usageTrackingService │◀─────┐                     │
│                        │                       │      │                      │
│                        │  - extractUsage()     │      │                      │
│                        │  - calculateCost()    │      │                      │
│                        │  - logUsage()         │      │ Async/Background    │
│                        │  - batchWrite()       │      │                      │
│                        └──────────┬───────────┘      │                      │
│                                   │                   │                      │
└───────────────────────────────────┼───────────────────┼──────────────────────┘
                                    │                   │
                                    ▼                   │
┌───────────────────────────────────────────────────────┼──────────────────────┐
│                         OpenRouter API                │                      │
│                                                       │                      │
│  POST /api/v1/chat/completions                       │                      │
│  Response: { usage: { prompt_tokens, ... } }         │                      │
│                                                       │                      │
└───────────────────────────────────────────────────────┼──────────────────────┘
                                                        │
                                    ┌───────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Supabase                                        │
│                                                                              │
│  ┌─────────────────┐  ┌────────────────────┐  ┌─────────────────────────┐  │
│  │ ai_usage_logs   │  │ ai_usage_daily_    │  │ ai_usage_monthly_       │  │
│  │                 │  │ summary            │  │ summary                 │  │
│  └─────────────────┘  └────────────────────┘  └─────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Edge Functions (Optional)                         │   │
│  │  - Daily aggregation cron job                                        │   │
│  │  - Monthly rollup cron job                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Data Flow Sequence

```
┌─────┐          ┌──────────┐          ┌───────────┐          ┌─────────┐
│User │          │aiService │          │OpenRouter │          │Supabase │
└──┬──┘          └────┬─────┘          └─────┬─────┘          └────┬────┘
   │                  │                      │                      │
   │ Send message     │                      │                      │
   │─────────────────▶│                      │                      │
   │                  │                      │                      │
   │                  │ POST /chat/completions                      │
   │                  │─────────────────────▶│                      │
   │                  │                      │                      │
   │                  │◀─────────────────────│                      │
   │                  │ Response + usage     │                      │
   │                  │                      │                      │
   │                  │──────────────────────┼──────────────────────│
   │                  │     Extract usage, calculate cost           │
   │                  │                      │                      │
   │◀─────────────────│                      │                      │
   │ AI Response      │                      │                      │
   │                  │                      │                      │
   │                  │                      │  INSERT usage log    │
   │                  │                      │  (async/background)  │
   │                  │──────────────────────┼─────────────────────▶│
   │                  │                      │                      │
```

---

## 5. Implementation Guide

### 5.1 Step 1: Create UsageTrackingService

Create a new service file at `src/services/usageTrackingService.ts`:

```typescript
import { supabase } from './supabase';

// Operation types matching the AI service methods
export type OperationType = 'transcribe' | 'analyze_text' | 'analyze_intent' | 'follow_up';

// Usage data extracted from OpenRouter response
export interface UsageData {
  requestId?: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;              // Cost in OpenRouter credits (directly from API)
  cachedTokens?: number;     // Tokens read from cache
  audioTokens?: number;      // Audio tokens (for audio models)
  reasoningTokens?: number;  // Reasoning tokens (for applicable models)
  responseTimeMs?: number;
}

/**
 * Extract usage data from OpenRouter API response
 *
 * IMPORTANT: The request must include `"usage": { "include": true }`
 * for this data to be available in the response.
 */
export function extractUsageFromResponse(
  responseData: any,
  model: string
): UsageData | null {
  if (!responseData?.usage) {
    console.warn('[UsageTracking] No usage data in response. Did you include "usage": { "include": true } in the request?');
    return null;
  }
  
  const { usage } = responseData;
  
  return {
    requestId: responseData.id,
    model,
    promptTokens: usage.prompt_tokens ?? 0,
    completionTokens: usage.completion_tokens ?? 0,
    totalTokens: usage.total_tokens ?? 0,
    cost: usage.cost ?? 0,  // OpenRouter provides cost directly!
    cachedTokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
    audioTokens: usage.prompt_tokens_details?.audio_tokens ?? 0,
    reasoningTokens: usage.completion_tokens_details?.reasoning_tokens ?? 0,
  };
}

/**
 * Log usage to Supabase (fire-and-forget, non-blocking)
 *
 * Uses the cost value directly from OpenRouter API response.
 */
export async function logUsage(
  userId: string,
  operationType: OperationType,
  usage: UsageData,
  options: {
    success?: boolean;
    errorMessage?: string;
    sessionId?: string;
  } = {}
): Promise<void> {
  const { success = true, errorMessage, sessionId } = options;
  
  try {
    const { error } = await supabase.from('ai_usage_logs').insert({
      user_id: userId,
      request_id: usage.requestId,
      session_id: sessionId,
      model: usage.model,
      operation_type: operationType,
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
      cost_credits: usage.cost,  // Store OpenRouter credits directly
      cached_tokens: usage.cachedTokens,
      audio_tokens: usage.audioTokens,
      reasoning_tokens: usage.reasoningTokens,
      success,
      error_message: errorMessage,
      response_time_ms: usage.responseTimeMs,
    });
    
    if (error) {
      console.error('[UsageTracking] Failed to log usage:', error);
    }
  } catch (err) {
    // Non-blocking - log error but don't throw
    console.error('[UsageTracking] Exception logging usage:', err);
  }
}

/**
 * Get user's usage summary for a date range
 */
export async function getUserUsageSummary(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalRequests: number;
  totalTokens: number;
  totalCostDollars: number;
  byOperation: Record<OperationType, number>;
} | null> {
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('operation_type, total_tokens, cost_microdollars')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());
  
  if (error || !data) {
    console.error('[UsageTracking] Failed to get usage summary:', error);
    return null;
  }
  
  const byOperation: Record<string, number> = {};
  let totalTokens = 0;
  let totalCostMicrodollars = 0;
  
  for (const row of data) {
    totalTokens += row.total_tokens;
    totalCostMicrodollars += row.cost_microdollars;
    byOperation[row.operation_type] = (byOperation[row.operation_type] || 0) + 1;
  }
  
  return {
    totalRequests: data.length,
    totalTokens,
    totalCostDollars: totalCostMicrodollars / 1_000_000,
    byOperation: byOperation as Record<OperationType, number>,
  };
}
```

### 5.2 Step 2: Modify aiService.ts Request Bodies

**CRITICAL CHANGE**: Add `"usage": { "include": true }` to ALL request bodies.

**Current Request Body (BEFORE):**
```typescript
const body = {
    model: CHAT_MODEL,
    messages: [...],
    response_format: { type: "json_object" },
    temperature: 0
};
```

**Updated Request Body (AFTER):**
```typescript
const body = {
    model: CHAT_MODEL,
    messages: [...],
    response_format: { type: "json_object" },
    temperature: 0,
    usage: { include: true }  // ENABLE USAGE ACCOUNTING
};
```

### 5.3 Step 3: Create Wrapper Function for API Calls

```typescript
// Add imports at top of aiService.ts
import {
  extractUsageFromResponse,
  logUsage,
  OperationType
} from '../services/usageTrackingService';
import { useAuthStore } from '../store/useAuthStore';

// Helper to get current user ID
function getCurrentUserId(): string | null {
  const { user, isGuestMode } = useAuthStore.getState();
  if (isGuestMode) return null; // Don't track guest usage
  return user?.id ?? null;
}

// Wrap API calls with usage tracking
async function callOpenRouterWithTracking(
  url: string,
  options: RequestInit,
  model: string,
  operationType: OperationType
): Promise<{ data: any; usage: UsageData | null }> {
  const startTime = Date.now();
  
  const response = await fetchWithRetry(url, options);
  
  if (!response.ok) {
    const errText = await response.text();
    // Log failed request
    const userId = getCurrentUserId();
    if (userId) {
      await logUsage(userId, operationType, {
        model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost: 0,
        responseTimeMs: Date.now() - startTime,
      }, {
        success: false,
        errorMessage: `${response.status}: ${errText}`
      });
    }
    throw new Error(`OpenRouter API Error: ${response.status} ${errText}`);
  }
  
  const data = await response.json();
  const usage = extractUsageFromResponse(data, model);
  
  if (usage) {
    usage.responseTimeMs = Date.now() - startTime;
  }
  
  // Log successful request (fire-and-forget)
  const userId = getCurrentUserId();
  if (userId && usage) {
    logUsage(userId, operationType, usage).catch(() => {});
  }
  
  return { data, usage };
}
```

### 5.4 Step 4: Apply to Each API Call

**transcribeAudio() - Line 609:**
```typescript
// Add usage: { include: true } to body
const body = {
    model: TRANSCRIPTION_MODEL,
    messages: [...],
    temperature: 0,
    usage: { include: true }  // ADD THIS
};

const { data } = await callOpenRouterWithTracking(
  "https://openrouter.ai/api/v1/chat/completions",
  {
    method: "POST",
    headers: { ... },
    body: JSON.stringify(body)
  },
  TRANSCRIPTION_MODEL,
  'transcribe'
);
```

**analyzeText() - Line 829:**
```typescript
const body = {
    model: CHAT_MODEL,
    messages: [...],
    response_format: { type: "json_object" },
    temperature: 0,
    usage: { include: true }  // ADD THIS
};

const { data } = await callOpenRouterWithTracking(
  "https://openrouter.ai/api/v1/chat/completions",
  { ... },
  CHAT_MODEL,
  'analyze_text'
);
```

**analyzeIntent() - Line 1448:**
```typescript
const body = {
    model: CHAT_MODEL,
    messages: [...],
    response_format: { type: "json_object" },
    temperature: 0,
    usage: { include: true }  // ADD THIS
};

const { data } = await callOpenRouterWithTracking(
  "https://openrouter.ai/api/v1/chat/completions",
  { ... },
  CHAT_MODEL,
  'analyze_intent'
);
```

**processFollowUpAnswer() - Line 1572:**
```typescript
const body = {
    model: CHAT_MODEL,
    messages: [...],
    response_format: { type: "json_object" },
    usage: { include: true }  // ADD THIS
};

const { data } = await callOpenRouterWithTracking(
  "https://openrouter.ai/api/v1/chat/completions",
  { ... },
  CHAT_MODEL,
  'follow_up'
);
```

---

## 6. Performance Considerations

### 6.1 Non-Blocking Writes

All usage logging should be fire-and-forget:

```typescript
// DON'T await usage logging in the critical path
logUsage(userId, operationType, usage).catch(console.error);
```

### 6.2 Batching (Optional Enhancement)

For high-frequency usage, implement a batching mechanism:

```typescript
class UsageLogBatcher {
  private buffer: UsageLogEntry[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private readonly maxBufferSize = 10;
  private readonly flushIntervalMs = 5000;
  
  add(entry: UsageLogEntry): void {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    } else if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), this.flushIntervalMs);
    }
  }
  
  private async flush(): Promise<void> {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
    
    if (this.buffer.length === 0) return;
    
    const entries = [...this.buffer];
    this.buffer = [];
    
    await supabase.from('ai_usage_logs').insert(entries);
  }
}
```

### 6.3 Error Handling

```typescript
// Wrap all database operations
async function safeLogUsage(...args): Promise<void> {
  try {
    await logUsage(...args);
  } catch (error) {
    // Log to console but never throw
    console.error('[UsageTracking] Error:', error);
    
    // Optional: Queue for retry
    // retryQueue.add({ ...args, retryCount: 0 });
  }
}
```

---

## 7. Aggregation Strategy

### 7.1 Daily Aggregation (Supabase Edge Function)

```typescript
// supabase/functions/aggregate-usage-daily/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  
  // Aggregate yesterday's usage for all users
  const { data: logs } = await supabase
    .from('ai_usage_logs')
    .select('user_id, operation_type, prompt_tokens, completion_tokens, total_tokens, cost_microdollars')
    .gte('created_at', `${dateStr}T00:00:00Z`)
    .lt('created_at', `${dateStr}T23:59:59Z`);
  
  // Group by user
  const userAggregates: Record<string, any> = {};
  
  for (const log of logs ?? []) {
    if (!userAggregates[log.user_id]) {
      userAggregates[log.user_id] = {
        user_id: log.user_id,
        date: dateStr,
        total_requests: 0,
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_tokens: 0,
        total_cost_microdollars: 0,
        operations_breakdown: {},
      };
    }
    
    const agg = userAggregates[log.user_id];
    agg.total_requests++;
    agg.total_prompt_tokens += log.prompt_tokens;
    agg.total_completion_tokens += log.completion_tokens;
    agg.total_tokens += log.total_tokens;
    agg.total_cost_microdollars += log.cost_microdollars;
    agg.operations_breakdown[log.operation_type] = 
      (agg.operations_breakdown[log.operation_type] || 0) + 1;
  }
  
  // Upsert aggregates
  for (const agg of Object.values(userAggregates)) {
    await supabase.from('ai_usage_daily_summary').upsert(agg);
  }
  
  return new Response(JSON.stringify({ success: true }));
});
```

### 7.2 Cron Schedule

```sql
-- In Supabase dashboard, create a cron job:
SELECT cron.schedule(
  'aggregate-usage-daily',
  '0 1 * * *',  -- Run at 1 AM UTC daily
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/aggregate-usage-daily',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
  );
  $$
);
```

---

## 8. Future Considerations

### 8.1 Analytics Dashboard

Consider building a usage dashboard with:
- Daily/weekly/monthly token consumption
- Cost breakdown by operation type
- Usage trends over time
- Per-user quota monitoring

### 8.2 Usage Limits & Quotas

```sql
-- Add user quota table
CREATE TABLE user_quotas (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    monthly_token_limit INTEGER DEFAULT 1000000,
    monthly_cost_limit_microdollars INTEGER DEFAULT 1000000, -- $1.00 default
    current_month_tokens INTEGER DEFAULT 0,
    current_month_cost INTEGER DEFAULT 0,
    last_reset_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.3 Alerts & Notifications

- Alert when user reaches 80%/90%/100% of quota
- Notify admins of unusual usage patterns
- Rate limiting for cost protection

---

## 9. Implementation Checklist

- [ ] Create `ai_usage_logs` table in Supabase
- [ ] Create `ai_model_pricing` table with initial data
- [ ] Create `usageTrackingService.ts` file
- [ ] Modify `aiService.ts` to use `callOpenRouterWithTracking()`
- [ ] Update `transcribeAudio()` call
- [ ] Update `analyzeText()` call  
- [ ] Update `analyzeIntent()` call
- [ ] Update `processFollowUpAnswer()` call
- [ ] Add RLS policies to usage tables
- [ ] Test usage logging with authenticated user
- [ ] (Optional) Create daily aggregation Edge Function
- [ ] (Optional) Create monthly aggregation Edge Function
- [ ] (Optional) Create usage dashboard component

---

## 10. References

- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [OpenAI API Response Format](https://platform.openai.com/docs/api-reference/chat/object)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)