-- Fix RLS policies on email_subscribers to allow checking admin status during approval flow

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Authenticated users can insert email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Authenticated users can update email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Authenticated users can delete email subscribers" ON email_subscribers;

-- Allow authenticated users to read email subscribers (existing behavior)
CREATE POLICY "Authenticated users can read email subscribers"
  ON email_subscribers
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to read email subscribers (for approval code validation)
CREATE POLICY "Service role can read email subscribers"
  ON email_subscribers
  FOR SELECT
  TO service_role
  USING (true);

-- Allow authenticated users to insert email subscribers
CREATE POLICY "Authenticated users can insert email subscribers"
  ON email_subscribers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update email subscribers
CREATE POLICY "Authenticated users can update email subscribers"
  ON email_subscribers
  FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete email subscribers
CREATE POLICY "Authenticated users can delete email subscribers"
  ON email_subscribers
  FOR DELETE
  TO authenticated
  USING (true);
