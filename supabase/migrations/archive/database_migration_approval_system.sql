-- Migration: Add approval system to prayer management

-- Add approval columns to prayers table
ALTER TABLE prayers 
ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
ADD COLUMN approved_by VARCHAR(255),
ADD COLUMN approved_at TIMESTAMPTZ,
ADD COLUMN denial_reason TEXT;

-- Add approval columns to prayer_updates table  
ALTER TABLE prayer_updates
ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
ADD COLUMN approved_by VARCHAR(255),
ADD COLUMN approved_at TIMESTAMPTZ,
ADD COLUMN denial_reason TEXT;

-- Create admin_users table for simple admin authentication
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin user (password: admin123 - should be changed in production)
INSERT INTO admin_users (username, password_hash, email) 
VALUES ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@church.org');

-- Create indexes for performance
CREATE INDEX idx_prayers_approval_status ON prayers(approval_status);
CREATE INDEX idx_prayer_updates_approval_status ON prayer_updates(approval_status);
CREATE INDEX idx_prayers_approved_at ON prayers(approved_at);
CREATE INDEX idx_prayer_updates_approved_at ON prayer_updates(approved_at);

-- Update existing prayers and updates to be approved (for backward compatibility)
UPDATE prayers SET approval_status = 'approved', approved_by = 'system', approved_at = NOW() WHERE approval_status = 'pending';
UPDATE prayer_updates SET approval_status = 'approved', approved_by = 'system', approved_at = NOW() WHERE approval_status = 'pending';

-- Create RLS policies for admin access
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Admin users can read their own data
CREATE POLICY "Admin users can read own data" ON admin_users
    FOR SELECT USING (auth.uid()::text = id::text OR auth.role() = 'service_role');

-- Update existing RLS policies to respect approval status
DROP POLICY IF EXISTS "Enable read access for all users" ON prayers;
CREATE POLICY "Enable read access for approved prayers" ON prayers
    FOR SELECT USING (approval_status = 'approved');

DROP POLICY IF EXISTS "Enable read access for all users" ON prayer_updates;  
CREATE POLICY "Enable read access for approved updates" ON prayer_updates
    FOR SELECT USING (approval_status = 'approved');

-- Admin policies for managing approvals (these require service role or admin authentication)
CREATE POLICY "Enable admin read access for all prayers" ON prayers
    FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Enable admin update access for prayers" ON prayers
    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Enable admin read access for all prayer updates" ON prayer_updates
    FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Enable admin update access for prayer updates" ON prayer_updates
    FOR UPDATE USING (auth.role() = 'service_role');