-- Add logo columns to admin_settings table for light/dark mode image support
ALTER TABLE admin_settings ADD COLUMN use_logo boolean DEFAULT false NOT NULL;
ALTER TABLE admin_settings ADD COLUMN light_mode_logo_blob text;
ALTER TABLE admin_settings ADD COLUMN dark_mode_logo_blob text;

-- Columns store base64-encoded image data as text for easy serialization
-- Example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
