-- Add reminder_interval_days column to admin_settings table
-- This setting controls how often reminder emails are sent to prayer requesters

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS reminder_interval_days INTEGER DEFAULT 7;

COMMENT ON COLUMN admin_settings.reminder_interval_days IS 'Number of days between reminder emails to prayer requesters. Set to 0 to disable reminders.';

-- Add last_reminder_sent column to prayers table
-- This tracks when the last reminder email was sent for each prayer

ALTER TABLE prayers
ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN prayers.last_reminder_sent IS 'Timestamp of when the last reminder email was sent to the requester for this prayer.';
