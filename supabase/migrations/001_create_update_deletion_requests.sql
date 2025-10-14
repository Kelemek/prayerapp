-- Migration: create update_deletion_requests table
-- This creates a table to hold user requests to delete prayer updates (requires admin approval)

CREATE TABLE IF NOT EXISTS update_deletion_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  update_id UUID NOT NULL REFERENCES prayer_updates(id) ON DELETE CASCADE,
  reason TEXT,
  requested_by TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure updated_at trigger exists (supabase-schema.sql defines it, but include for idempotency)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on change
DROP TRIGGER IF EXISTS update_update_deletion_requests_updated_at ON update_deletion_requests;
CREATE TRIGGER update_update_deletion_requests_updated_at
  BEFORE UPDATE ON update_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE update_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policy: allow all operations (adjust for production)
CREATE POLICY "Allow all operations on update_deletion_requests" ON update_deletion_requests
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_update_deletion_requests_update_id ON update_deletion_requests(update_id);
CREATE INDEX IF NOT EXISTS idx_update_deletion_requests_approval_status ON update_deletion_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_update_deletion_requests_created_at ON update_deletion_requests(created_at DESC);
