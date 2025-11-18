-- Add allow_user_deletions and allow_user_updates columns to admin_settings table
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS allow_user_deletions BOOLEAN DEFAULT true;

ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS allow_user_updates BOOLEAN DEFAULT true;

-- Set default values for existing row
UPDATE admin_settings 
SET allow_user_deletions = true,
    allow_user_updates = true
WHERE id = 1 AND (allow_user_deletions IS NULL OR allow_user_updates IS NULL);

COMMENT ON COLUMN admin_settings.allow_user_deletions IS 'Controls whether front-end users can delete prayers and updates';
COMMENT ON COLUMN admin_settings.allow_user_updates IS 'Controls whether front-end users can add updates to prayers';
