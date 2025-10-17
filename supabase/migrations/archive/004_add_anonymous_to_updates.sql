-- Add is_anonymous column to prayer_updates table
ALTER TABLE prayer_updates
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_prayer_updates_is_anonymous ON prayer_updates(is_anonymous);
