-- Prayer Manager Database Schema for Supabase
-- Run this SQL in your Supabase SQL editor to create the necessary tables

-- Create prayers table
CREATE TABLE IF NOT EXISTS prayers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'ongoing', 'answered', 'closed')),
  requester TEXT NOT NULL,
  email VARCHAR(255),
  is_anonymous BOOLEAN DEFAULT false,
  date_requested TIMESTAMPTZ DEFAULT NOW(),
  date_answered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create prayer_updates table
CREATE TABLE IF NOT EXISTS prayer_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create deletion_requests table
CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
  reason TEXT,
  requested_by TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for prayers table
CREATE TRIGGER update_prayers_updated_at 
    BEFORE UPDATE ON prayers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust these based on your security needs)
-- For now, we'll allow all operations for simplicity
-- In production, you might want to add authentication and more restrictive policies

CREATE POLICY "Allow all operations on prayers" ON prayers
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on prayer_updates" ON prayer_updates
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on deletion_requests" ON deletion_requests
    FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prayers_status ON prayers(status);
CREATE INDEX IF NOT EXISTS idx_prayers_is_anonymous ON prayers(is_anonymous);
CREATE INDEX IF NOT EXISTS idx_prayers_email ON prayers(email);
CREATE INDEX IF NOT EXISTS idx_prayers_created_at ON prayers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_updates_prayer_id ON prayer_updates(prayer_id);
CREATE INDEX IF NOT EXISTS idx_prayer_updates_created_at ON prayer_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_prayer_id ON deletion_requests(prayer_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_approval_status ON deletion_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_created_at ON deletion_requests(created_at DESC);

-- Insert some sample data (optional)
INSERT INTO prayers (title, description, requester) VALUES 
  ('Healing for John', 'Please pray for John''s recovery from surgery', 'Sarah Johnson'),
  ('Guidance for Career Decision', 'Seeking God''s wisdom for a new job opportunity', 'Michael Chen'),
  ('Thanksgiving for Safe Travel', 'Praising God for safe arrival after long journey', 'Pastor David');

-- Add a sample update
INSERT INTO prayer_updates (prayer_id, content, author) 
SELECT id, 'John is recovering well and should be home soon!', 'Sarah Johnson' 
FROM prayers WHERE title = 'Healing for John' LIMIT 1;