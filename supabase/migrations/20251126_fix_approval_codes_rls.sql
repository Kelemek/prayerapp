-- Fix RLS policies on approval_codes table to allow client-side inserts

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own approval codes" ON approval_codes;
DROP POLICY IF EXISTS "Service role can manage approval codes" ON approval_codes;

-- Allow anyone to read their own approval codes (by email)
CREATE POLICY "Users can view their own approval codes" ON approval_codes
  FOR SELECT USING (auth.jwt() ->> 'email' = admin_email);

-- Allow authenticated users to insert approval codes (for generating personalized links)
CREATE POLICY "Authenticated users can create approval codes" ON approval_codes
  FOR INSERT WITH CHECK (true);

-- Allow service role to manage approval codes (for Edge Functions)
CREATE POLICY "Service role can manage approval codes" ON approval_codes
  FOR ALL USING (auth.role() = 'service_role');
