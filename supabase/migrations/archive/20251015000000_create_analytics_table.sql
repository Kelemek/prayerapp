-- Create analytics table to track site usage
CREATE TABLE IF NOT EXISTS analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index on event_type for faster queries
CREATE INDEX idx_analytics_event_type ON analytics(event_type);

-- Create index on created_at for time-based queries
CREATE INDEX idx_analytics_created_at ON analytics(created_at);

-- Enable RLS
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert analytics (tracking page views)
CREATE POLICY "Allow anonymous inserts" ON analytics
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users (admins) can read analytics
CREATE POLICY "Allow authenticated reads" ON analytics
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial record to test
INSERT INTO analytics (event_type, event_data) 
VALUES ('migration_complete', '{"migration": "analytics_table_created"}'::jsonb);
