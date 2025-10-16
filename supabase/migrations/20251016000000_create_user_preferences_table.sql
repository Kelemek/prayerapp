-- Create user_preferences table for managing email notification settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  receive_new_prayer_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX idx_user_preferences_email ON user_preferences(email);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read their own preferences by email
CREATE POLICY "Anyone can read preferences by email"
  ON user_preferences
  FOR SELECT
  USING (true);

-- Allow anyone to insert their preferences
CREATE POLICY "Anyone can insert preferences"
  ON user_preferences
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update their own preferences
CREATE POLICY "Anyone can update preferences"
  ON user_preferences
  FOR UPDATE
  USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();
