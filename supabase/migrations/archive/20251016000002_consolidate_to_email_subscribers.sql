-- Consolidation Migration: Merge user_preferences into email_subscribers
-- This migration adds is_admin column and migrates all user preference data

-- Step 1: Add is_admin column to email_subscribers
ALTER TABLE email_subscribers 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Step 2: Create index on is_admin for filtering
CREATE INDEX IF NOT EXISTS idx_email_subscribers_is_admin ON email_subscribers(is_admin);

-- Step 3: Migrate data from user_preferences to email_subscribers
-- Insert users who don't exist in email_subscribers yet
INSERT INTO email_subscribers (email, name, is_active, is_admin, created_at, updated_at)
SELECT 
  up.email,
  COALESCE(up.name, 'User') as name,  -- Fallback if name is NULL
  up.receive_new_prayer_notifications as is_active,
  false as is_admin,
  up.created_at,
  up.updated_at
FROM user_preferences up
WHERE NOT EXISTS (
  SELECT 1 FROM email_subscribers es 
  WHERE es.email = up.email
)
ON CONFLICT (email) DO NOTHING;

-- Step 4: Update existing email_subscribers with data from user_preferences
-- This syncs any users who were manually added as subscribers
UPDATE email_subscribers es
SET 
  name = COALESCE(up.name, es.name),  -- Keep existing name if user_preferences name is NULL
  is_active = up.receive_new_prayer_notifications,
  is_admin = false,  -- Mark as not admin (regular user)
  updated_at = NOW()
FROM user_preferences up
WHERE es.email = up.email;

-- Step 5: Mark existing subscribers without user_preferences as admins
-- These are subscribers who were manually added by admins
UPDATE email_subscribers
SET is_admin = true
WHERE email NOT IN (SELECT email FROM user_preferences);

-- Step 6: Add comment to table
COMMENT ON COLUMN email_subscribers.is_admin IS 'True for admin subscribers (manually added), false for regular users (submitted via settings)';

-- Step 7: Verify migration
-- This should return 0 if migration was successful
DO $$
DECLARE
  user_pref_count INTEGER;
  email_sub_count INTEGER;
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_pref_count FROM user_preferences;
  SELECT COUNT(*) INTO email_sub_count FROM email_subscribers WHERE is_admin = false;
  
  -- Count users in user_preferences not in email_subscribers
  SELECT COUNT(*) INTO missing_count 
  FROM user_preferences up
  WHERE NOT EXISTS (
    SELECT 1 FROM email_subscribers es WHERE es.email = up.email
  );
  
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '- user_preferences records: %', user_pref_count;
  RAISE NOTICE '- email_subscribers (users): %', email_sub_count;
  RAISE NOTICE '- Missing users: %', missing_count;
  
  IF missing_count > 0 THEN
    RAISE WARNING 'Migration incomplete: % users not migrated', missing_count;
  ELSE
    RAISE NOTICE 'Migration successful: All users migrated';
  END IF;
END $$;

-- NOTE: Do NOT drop user_preferences table yet!
-- Keep it as backup until fully tested and verified.
-- To drop later: DROP TABLE user_preferences;
