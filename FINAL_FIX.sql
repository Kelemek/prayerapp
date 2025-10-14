-- DEFINITIVE FIX for admin_settings 406 error
-- Copy and paste this ENTIRE script into Supabase SQL Editor

-- Step 1: Drop the table completely and start fresh
DROP TABLE IF EXISTS admin_settings CASCADE;

-- Step 2: Recreate the table
CREATE TABLE admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  notification_emails TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Step 3: Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Step 4: Create a permissive policy for authenticated users
CREATE POLICY "authenticated_all_access"
  ON admin_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 5: Also allow anon access for reading (optional, but helps during setup)
CREATE POLICY "public_read_access"
  ON admin_settings
  FOR SELECT
  TO anon
  USING (true);

-- Step 6: Insert the default row
INSERT INTO admin_settings (id, notification_emails)
VALUES (1, '{}');

-- Step 7: Verify it works
SELECT * FROM admin_settings;

-- You should see one row with id=1 and an empty array for notification_emails
