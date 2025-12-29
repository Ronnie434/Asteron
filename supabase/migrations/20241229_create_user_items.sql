-- Cloud Sync: Create user_items table
-- This table stores synced items for authenticated users
-- User's email (Google/Apple) is anchored via user_id from Supabase Auth

-- Create items table for synced user data
CREATE TABLE IF NOT EXISTS user_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT,
  type TEXT NOT NULL DEFAULT 'task',
  due_at TIMESTAMPTZ,
  remind_at TIMESTAMPTZ,
  repeat TEXT DEFAULT 'none',
  repeat_config JSONB,
  skipped_dates JSONB,
  completed_dates JSONB,
  priority TEXT NOT NULL DEFAULT 'med',
  status TEXT NOT NULL DEFAULT 'active',
  confidence REAL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, local_id)
);

-- Row Level Security: Users can only access their own items
ALTER TABLE user_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own items
CREATE POLICY "Users can view own items" ON user_items
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can INSERT their own items
CREATE POLICY "Users can insert own items" ON user_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can UPDATE their own items
CREATE POLICY "Users can update own items" ON user_items
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can DELETE their own items
CREATE POLICY "Users can delete own items" ON user_items
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_items_user_id ON user_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_items_updated_at ON user_items(updated_at);
CREATE INDEX IF NOT EXISTS idx_user_items_local_id ON user_items(user_id, local_id);
