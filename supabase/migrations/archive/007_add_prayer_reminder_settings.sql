-- Add reminder_interval_days column to admin_settings table
-- This setting controls how often reminder emails are sent to prayer requesters

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS reminder_interval_days INTEGER DEFAULT 7;

COMMENT ON COLUMN admin_settings.reminder_interval_days IS 'Number of days of inactivity (no updates) before sending reminder emails to prayer requesters. Set to 0 to disable reminders.';
