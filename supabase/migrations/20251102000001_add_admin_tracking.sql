-- Add admin tracking fields to email_subscribers table
ALTER TABLE email_subscribers 
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE;

-- Create index on is_admin for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_email_subscribers_admin ON email_subscribers(is_admin) WHERE is_admin = true;

-- Create a function to update last_sign_in_at when admin logs in
-- This will be called from the Edge Function or client after successful authentication
CREATE OR REPLACE FUNCTION update_admin_last_sign_in(admin_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE email_subscribers
  SET last_sign_in_at = TIMEZONE('utc', NOW())
  WHERE email = admin_email AND is_admin = true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_admin_last_sign_in(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_last_sign_in(TEXT) TO anon;

-- Add a comment
COMMENT ON FUNCTION update_admin_last_sign_in IS 'Updates the last_sign_in_at timestamp for admin users';
