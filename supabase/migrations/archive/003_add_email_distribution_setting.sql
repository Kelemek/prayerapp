-- Add email distribution preference to admin_settings
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS email_distribution VARCHAR(20) DEFAULT 'admin_only' CHECK (email_distribution IN ('admin_only', 'all_users'));

-- Update existing row if it exists
UPDATE admin_settings SET email_distribution = 'admin_only' WHERE id = 1 AND email_distribution IS NULL;
