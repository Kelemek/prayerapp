-- Remove obsolete days_before_ongoing setting
-- Date: 2025-11-20
-- Reason: The 'ongoing' status was removed on 2025-11-05. This setting is now redundant
--         since we only use days_before_archive for reminder-based auto-archiving.

-- Drop the column
ALTER TABLE admin_settings DROP COLUMN IF EXISTS days_before_ongoing;

-- Update comment
COMMENT ON TABLE admin_settings IS 'Admin configuration settings. Auto-archiving is now handled exclusively by days_before_archive after prayer reminders.';
