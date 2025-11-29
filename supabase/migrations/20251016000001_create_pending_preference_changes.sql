-- Create pending_preference_changes table for approval workflow
CREATE TABLE IF NOT EXISTS pending_preference_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  receive_new_prayer_notifications BOOLEAN NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_pending_preference_changes_email ON pending_preference_changes(email);
CREATE INDEX idx_pending_preference_changes_status ON pending_preference_changes(approval_status);

-- Enable RLS
ALTER TABLE pending_preference_changes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert pending changes
CREATE POLICY "Anyone can insert pending preference changes"
  ON pending_preference_changes
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to read all pending changes (for admin)
CREATE POLICY "Authenticated users can read pending preference changes"
  ON pending_preference_changes
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to update pending changes (for admin approval)
CREATE POLICY "Authenticated users can update pending preference changes"
  ON pending_preference_changes
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete pending changes (for admin)
CREATE POLICY "Authenticated users can delete pending preference changes"
  ON pending_preference_changes
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_pending_preference_changes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = public;

CREATE TRIGGER pending_preference_changes_updated_at
  BEFORE UPDATE ON pending_preference_changes
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_preference_changes_updated_at();

-- Add name field to existing user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS name TEXT;
