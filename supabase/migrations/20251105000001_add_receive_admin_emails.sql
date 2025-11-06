-- Add receive_admin_emails column to email_subscribers table
-- This allows admins to opt-in/opt-out of receiving admin notification emails

ALTER TABLE email_subscribers 
ADD COLUMN IF NOT EXISTS receive_admin_emails BOOLEAN DEFAULT true;

-- Create index for efficient filtering of admins who want emails
CREATE INDEX IF NOT EXISTS idx_email_subscribers_receive_admin_emails 
ON email_subscribers(receive_admin_emails) 
WHERE is_admin = true AND receive_admin_emails = true;

-- Comment for documentation
COMMENT ON COLUMN email_subscribers.receive_admin_emails IS 'Whether this admin wants to receive admin notification emails (for prayer approvals, etc.)';
