-- Migration to add mark_as_answered column to prayer_updates table
-- Date: 2025-11-06

-- Add mark_as_answered column to prayer_updates table
ALTER TABLE prayer_updates 
ADD COLUMN IF NOT EXISTS mark_as_answered BOOLEAN DEFAULT FALSE;

-- Add comment explaining the column
COMMENT ON COLUMN prayer_updates.mark_as_answered IS 'Whether to mark the prayer as answered when this update is approved';
