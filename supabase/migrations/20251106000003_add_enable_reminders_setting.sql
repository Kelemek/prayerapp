-- Add enable_reminders setting to admin_settings table
ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS enable_reminders BOOLEAN DEFAULT false;

-- Update existing row to have the default value if it exists
UPDATE admin_settings
SET 
  enable_reminders = COALESCE(enable_reminders, false)
WHERE id = 1;
