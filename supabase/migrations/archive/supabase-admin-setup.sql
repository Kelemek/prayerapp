-- Create admin user setup for Supabase Auth
-- This should be run in your Supabase SQL editor

-- First, create the admin user (replace with your desired admin email and password)
-- You can do this through the Supabase Auth UI or by running this after enabling auth

-- Create a function to check if a user is admin
CREATE OR REPLACE FUNCTION is_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user email is in the admin list
  RETURN user_email IN ('admin@prayerapp.com', 'admin@example.com');
END;
$$;

-- Create RLS policies that respect admin status
-- Update existing prayer table policies if they exist

-- Enable RLS on prayers table (if not already enabled)
ALTER TABLE prayers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (optional, adjust as needed)
-- DROP POLICY IF EXISTS "Users can view approved prayers" ON prayers;
-- DROP POLICY IF EXISTS "Admins can view all prayers" ON prayers;
-- DROP POLICY IF EXISTS "Admins can modify all prayers" ON prayers;

-- Create new policies that check for admin status
CREATE POLICY "Users can view approved prayers" ON prayers
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Admins can view all prayers" ON prayers
  FOR SELECT USING (is_admin(auth.jwt() ->> 'email'));

CREATE POLICY "Admins can modify all prayers" ON prayers
  FOR ALL USING (is_admin(auth.jwt() ->> 'email'));

-- Similar policies for other tables (prayer_updates, deletion_requests, status_change_requests)
CREATE POLICY "Admins can manage prayer_updates" ON prayer_updates
  FOR ALL USING (is_admin(auth.jwt() ->> 'email'));

CREATE POLICY "Admins can manage deletion_requests" ON deletion_requests  
  FOR ALL USING (is_admin(auth.jwt() ->> 'email'));

CREATE POLICY "Admins can manage status_change_requests" ON status_change_requests
  FOR ALL USING (is_admin(auth.jwt() ->> 'email'));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Instructions for manual admin user creation:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" 
-- 3. Enter email: admin@prayerapp.com (or your preferred admin email)
-- 4. Enter a secure password
-- 5. Confirm the user's email if needed
-- 
-- Alternatively, you can use the auth.users table directly, but it's not recommended
-- as it bypasses Supabase's auth validation