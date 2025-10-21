-- Add app branding settings to admin_settings table
-- Allows customization of the app title and subtitle displayed in the header

ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS app_title TEXT DEFAULT 'Church Prayer Manager';

ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS app_subtitle TEXT DEFAULT 'Keeping our community connected in prayer';

-- Add comments
COMMENT ON COLUMN admin_settings.app_title IS 'Main title displayed in the app header';
COMMENT ON COLUMN admin_settings.app_subtitle IS 'Subtitle/tagline displayed under the main title';
