-- Add reply_to_email column to admin_settings table
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS reply_to_email TEXT;

-- Set a default value for existing row
UPDATE admin_settings 
SET reply_to_email = 'markdlarson@me.com' 
WHERE id = 1 AND reply_to_email IS NULL;
