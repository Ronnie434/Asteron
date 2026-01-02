-- Email Brief Preferences: Store user email notification settings
-- This table allows the scheduled email function to access preferences

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_brief_enabled BOOLEAN DEFAULT FALSE,
  daily_brief_time TIME DEFAULT '08:00',
  weekly_brief_enabled BOOLEAN DEFAULT FALSE,
  weekly_brief_day SMALLINT DEFAULT 0,  -- 0=Sunday, 6=Saturday
  weekly_brief_time TIME DEFAULT '08:00',
  email TEXT,
  first_name TEXT,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for scheduled email queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_daily ON user_preferences(daily_brief_enabled, daily_brief_time);
CREATE INDEX IF NOT EXISTS idx_user_preferences_weekly ON user_preferences(weekly_brief_enabled, weekly_brief_day, weekly_brief_time);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on changes
CREATE TRIGGER trigger_update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();
