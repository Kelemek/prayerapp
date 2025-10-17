-- Manual Migration for Anonymous Prayers
-- Run this script in the Supabase SQL Editor

-- Check if columns already exist before adding them
DO $$ 
BEGIN
    -- Add email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='prayers' AND column_name='email') THEN
        ALTER TABLE prayers ADD COLUMN email VARCHAR(255);
    END IF;
    
    -- Add is_anonymous column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='prayers' AND column_name='is_anonymous') THEN
        ALTER TABLE prayers ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add prayer_for column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='prayers' AND column_name='prayer_for') THEN
        ALTER TABLE prayers ADD COLUMN prayer_for VARCHAR(255) NOT NULL DEFAULT 'General Prayer';
    END IF;
END $$;

-- Create indexes for new columns (only if they don't already exist)
CREATE INDEX IF NOT EXISTS idx_prayers_email ON prayers(email);
CREATE INDEX IF NOT EXISTS idx_prayers_is_anonymous ON prayers(is_anonymous);
CREATE INDEX IF NOT EXISTS idx_prayers_prayer_for ON prayers(prayer_for);
CREATE INDEX IF NOT EXISTS idx_prayers_anonymous_status ON prayers(is_anonymous, approval_status) WHERE is_anonymous = true;

-- Update existing prayers to have is_anonymous = false by default
UPDATE prayers SET is_anonymous = FALSE WHERE is_anonymous IS NULL;

-- Create deletion_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
    reason TEXT,
    requested_by VARCHAR(255) NOT NULL,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    denial_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for deletion_requests table
CREATE INDEX IF NOT EXISTS idx_deletion_requests_prayer_id ON deletion_requests(prayer_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_approval_status ON deletion_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_created_at ON deletion_requests(created_at);

-- Enable RLS on deletion_requests
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for deletion_requests
DROP POLICY IF EXISTS "Anyone can submit deletion requests" ON deletion_requests;
CREATE POLICY "Anyone can submit deletion requests" ON deletion_requests
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view deletion requests" ON deletion_requests;
CREATE POLICY "Anyone can view deletion requests" ON deletion_requests
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only authenticated users can update deletion requests" ON deletion_requests;
CREATE POLICY "Only authenticated users can update deletion requests" ON deletion_requests
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only authenticated users can delete deletion requests" ON deletion_requests;
CREATE POLICY "Only authenticated users can delete deletion requests" ON deletion_requests
    FOR DELETE USING (auth.role() = 'authenticated');