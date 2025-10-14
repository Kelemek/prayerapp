-- Fix admin_settings table setup
-- Run this in Supabase SQL Editor to fix RLS and access issues

-- First, check if table exists and create if needed
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  notification_emails TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Authenticated users can read admin settings" ON admin_settings;
DROP POLICY IF EXISTS "Authenticated users can update admin settings" ON admin_settings;
DROP POLICY IF EXISTS "Authenticated users can insert admin settings" ON admin_settings;
DROP POLICY IF EXISTS "Allow all authenticated access" ON admin_settings;

-- Create simple policy that allows ALL operations for authenticated users
CREATE POLICY "Allow all authenticated access"
  ON admin_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure default row exists
INSERT INTO admin_settings (id, notification_emails)
VALUES (1, '{}')
ON CONFLICT (id) DO NOTHING;

-- Verify the setup
SELECT 
  id, 
  notification_emails, 
  created_at, 
  updated_at 
FROM admin_settings;
