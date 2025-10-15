-- Apply Prayer Reminder Settings Migration
-- Run this in your Supabase SQL Editor

-- Step 1: Add reminder_interval_days column to admin_settings
ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS reminder_interval_days INTEGER DEFAULT 7;

COMMENT ON COLUMN admin_settings.reminder_interval_days IS 'Number of days of inactivity (no updates) before sending reminder emails to prayer requesters. Set to 0 to disable reminders.';

-- Step 2: Verify the column was added
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'admin_settings' 
  AND column_name = 'reminder_interval_days';

-- Step 3: Initialize the setting if admin_settings row exists
UPDATE admin_settings 
SET reminder_interval_days = 7 
WHERE id = 1 AND reminder_interval_days IS NULL;

-- Step 4: Verify the setting
SELECT id, reminder_interval_days FROM admin_settings WHERE id = 1;

-- Expected result: Should show reminder_interval_days = 7
