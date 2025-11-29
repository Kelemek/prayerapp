-- Migration: Add email verification system
-- Part 1: Add admin setting to enable/disable email verification
-- Part 2: Create verification_codes table

-- Add require_email_verification setting to admin_settings table
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS require_email_verification BOOLEAN DEFAULT false;

-- Add verification_code_length setting to admin_settings table
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS verification_code_length INTEGER DEFAULT 6 CHECK (verification_code_length IN (4, 6, 8));

-- Add verification_code_expiry_minutes setting to admin_settings table
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS verification_code_expiry_minutes INTEGER DEFAULT 15 CHECK (verification_code_expiry_minutes >= 5 AND verification_code_expiry_minutes <= 60);

-- Add comments
COMMENT ON COLUMN admin_settings.require_email_verification IS 'When enabled, users must verify their email before submitting prayers, updates, deletions, status changes, or preference changes';
COMMENT ON COLUMN admin_settings.verification_code_length IS 'Length of verification code (4, 6, or 8 digits). Default is 6.';
COMMENT ON COLUMN admin_settings.verification_code_expiry_minutes IS 'Minutes before verification code expires (5-60 minutes). Default is 15.';

-- Create verification_codes table for email verification system
-- This table stores temporary verification codes sent to users
-- before they can submit prayers, updates, deletions, status changes, or preference changes

CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'prayer_submission',
    'prayer_update',
    'deletion_request',
    'update_deletion_request',
    'status_change_request',
    'preference_change'
  )),
  action_data JSONB NOT NULL,  -- Stores the form data to submit after verification
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_action_type ON verification_codes(action_type);

-- Enable Row Level Security
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert verification codes (when requesting)
DROP POLICY IF EXISTS "Anyone can insert verification codes" ON verification_codes;
CREATE POLICY "Anyone can insert verification codes"
  ON verification_codes
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to select verification codes (when verifying)
DROP POLICY IF EXISTS "Anyone can read verification codes" ON verification_codes;
CREATE POLICY "Anyone can read verification codes"
  ON verification_codes
  FOR SELECT
  USING (true);

-- Allow updates for marking codes as used
DROP POLICY IF EXISTS "Anyone can update verification codes" ON verification_codes;
CREATE POLICY "Anyone can update verification codes"
  ON verification_codes
  FOR UPDATE
  USING (true);

-- Function to clean up expired verification codes
-- Run this periodically to keep the table clean
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < NOW() - INTERVAL '24 hours'  -- Keep for 24 hours after expiration for audit
  OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '24 hours');  -- Delete used codes after 24 hours
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add comment to table
COMMENT ON TABLE verification_codes IS 'Stores temporary email verification codes for user actions';
COMMENT ON COLUMN verification_codes.action_data IS 'JSONB containing the form data to submit after successful verification';
COMMENT ON COLUMN verification_codes.expires_at IS 'Code expires 15 minutes after creation';
COMMENT ON COLUMN verification_codes.used_at IS 'Timestamp when code was used (NULL means not yet used)';
