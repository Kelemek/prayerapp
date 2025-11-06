-- Add auto-archive settings to admin_settings table
ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS enable_auto_archive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS days_before_archive INTEGER DEFAULT 7;

-- Update existing row to have the default values if it exists
UPDATE admin_settings
SET 
  enable_auto_archive = COALESCE(enable_auto_archive, false),
  days_before_archive = COALESCE(days_before_archive, 7)
WHERE id = 1;
