-- Create approval_codes table for one-time session codes
CREATE TABLE IF NOT EXISTS approval_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(255) UNIQUE NOT NULL,
  admin_email VARCHAR(255) NOT NULL,
  approval_type VARCHAR(50) NOT NULL CHECK (approval_type IN ('prayer', 'update', 'deletion', 'status_change')),
  approval_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (admin_email) REFERENCES email_subscribers(email) ON DELETE CASCADE
);

-- Create index for fast code lookups
CREATE INDEX idx_approval_codes_code ON approval_codes(code);
CREATE INDEX idx_approval_codes_admin_email ON approval_codes(admin_email);
CREATE INDEX idx_approval_codes_expires_at ON approval_codes(expires_at);

-- Enable RLS for security
ALTER TABLE approval_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read their own approval codes (by email)
CREATE POLICY "Users can view their own approval codes" ON approval_codes
  FOR SELECT USING (auth.jwt() ->> 'email' = admin_email);

-- Allow authenticated users to insert approval codes (for generating personalized links)
CREATE POLICY "Authenticated users can create approval codes" ON approval_codes
  FOR INSERT WITH CHECK (true);

-- Allow service role to manage approval codes (for Edge Functions)
CREATE POLICY "Service role can manage approval codes" ON approval_codes
  FOR ALL USING (auth.role() = 'service_role');
