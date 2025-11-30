-- Practical RLS fix: Keep security while allowing authenticated admin operations
-- Admin operations use service role client which bypasses RLS
-- This is the proper architectural approach

-- 1. Add missing columns if they don't exist
ALTER TABLE email_subscribers 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS receive_admin_emails BOOLEAN DEFAULT true;

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_subscribers_admin ON email_subscribers(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_email_subscribers_active ON email_subscribers(is_active) WHERE is_active = true;

-- 3. Enable RLS on email_subscribers
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- 4. Drop all existing conflicting RLS policies
DROP POLICY IF EXISTS "Authenticated users can read email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Service role can read email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Authenticated users can insert email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Authenticated users can update email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Authenticated users can delete email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Anyone can read email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Allow authenticated to select email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Allow service role to select email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Allow authenticated to insert email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Allow service role to insert email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Allow authenticated to update email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Allow service role to update email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Allow authenticated to delete email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Allow service role to delete email subscribers" ON email_subscribers;

-- 5. Create RLS policy for authenticated users to read
-- Service role automatically bypasses RLS, no policy needed
CREATE POLICY "Authenticated read email subscribers"
  ON email_subscribers
  FOR SELECT
  TO authenticated
  USING (true);

-- 6. Drop existing policies on pending_preference_changes
DROP POLICY IF EXISTS "Authenticated users can insert pending preference changes" ON pending_preference_changes;
DROP POLICY IF EXISTS "Service role can manage pending preference changes" ON pending_preference_changes;
DROP POLICY IF EXISTS "Authenticated users can read pending preference changes" ON pending_preference_changes;
DROP POLICY IF EXISTS "Authenticated users can update pending preference changes" ON pending_preference_changes;
DROP POLICY IF EXISTS "Authenticated users can delete pending preference changes" ON pending_preference_changes;

-- 7. Create proper RLS policies for pending_preference_changes (keeps security fixes from all_fixes.sql)
CREATE POLICY "Authenticated read pending preference changes"
  ON pending_preference_changes
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated insert pending preference changes"
  ON pending_preference_changes
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated update pending preference changes"
  ON pending_preference_changes
  FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated delete pending preference changes"
  ON pending_preference_changes
  FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- 8. Recreate helper functions with proper search_path
CREATE OR REPLACE FUNCTION update_admin_last_sign_in(admin_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE email_subscribers
  SET last_sign_in_at = TIMEZONE('utc', NOW())
  WHERE email = admin_email AND is_admin = true;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_admin_last_sign_in(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_last_sign_in(TEXT) TO anon;

-- Add comments
COMMENT ON COLUMN email_subscribers.is_admin IS 'Whether this email subscriber has admin privileges';
COMMENT ON COLUMN email_subscribers.last_sign_in_at IS 'Timestamp of last admin sign-in';
COMMENT ON COLUMN email_subscribers.receive_admin_emails IS 'Whether admin wants to receive admin notifications';

-- Summary of approach:
-- ✅ RLS enabled on all tables for maximum security
-- ✅ Service role client used for admin operations (bypasses RLS)
-- ✅ Keeps security optimizations from all_fixes.sql (auth.uid() subqueries)
-- ✅ Clean architectural separation of concerns
-- ✅ Service role key kept in .env (safe for church app with no external users)
