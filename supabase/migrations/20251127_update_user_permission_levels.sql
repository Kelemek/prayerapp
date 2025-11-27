-- Migration: Update admin_settings to support permission levels
-- Changes: Replace allow_user_deletions and allow_user_updates boolean fields
-- with deletions_allowed and updates_allowed that support:
-- 'everyone', 'admin-only', 'original-requestor'

BEGIN;

-- Drop existing columns if they exist
ALTER TABLE admin_settings
DROP COLUMN IF EXISTS allow_user_deletions,
DROP COLUMN IF EXISTS allow_user_updates;

-- Add new columns with permission level support
ALTER TABLE admin_settings
ADD COLUMN deletions_allowed TEXT DEFAULT 'everyone' CHECK (deletions_allowed IN ('everyone', 'admin-only', 'original-requestor')),
ADD COLUMN updates_allowed TEXT DEFAULT 'everyone' CHECK (updates_allowed IN ('everyone', 'admin-only', 'original-requestor'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_settings_permissions ON admin_settings(deletions_allowed, updates_allowed);

COMMIT;
