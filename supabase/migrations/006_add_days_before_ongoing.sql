-- Add days_before_ongoing column to admin_settings table
-- This setting controls how many days before a prayer automatically transitions from 'current' to 'ongoing'

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS days_before_ongoing INTEGER DEFAULT 30;

COMMENT ON COLUMN admin_settings.days_before_ongoing IS 'Number of days before a prayer automatically transitions from current to ongoing. Set to 0 to disable auto-transition.';
