# Analytics Setup Guide

## Overview
The site now tracks page views and displays analytics in the Admin Portal settings tab.

## Database Setup

### Apply the Migration

Run this SQL in your Supabase SQL Editor:

```sql
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
```

## Features

### Page View Tracking
- Automatically tracks every page load
- Records timestamp, path, and hash
- Silent failure - doesn't disrupt user experience

### Admin Analytics Dashboard
Located in Admin Portal → Settings tab:

#### Stats Displayed:
1. **Today** - Page views for current day
2. **This Week** - Page views for last 7 days
3. **This Month** - Page views for last 30 days
4. **All Time** - Total page views since tracking started

### Privacy & Security
- Anonymous users can only INSERT analytics (track views)
- Only authenticated admins can READ analytics data
- No personally identifiable information is stored
- Uses Supabase Row Level Security (RLS)

## Implementation Details

### Files Modified:
1. **src/App.tsx** - Added page view tracking on component mount
2. **src/components/AdminPortal.tsx** - Added analytics stats display in settings tab
3. **supabase/migrations/20251015000000_create_analytics_table.sql** - Database schema

### Data Structure:
```typescript
{
  id: UUID,
  event_type: 'page_view',
  event_data: {
    timestamp: ISO timestamp,
    path: window.location.pathname,
    hash: window.location.hash
  },
  created_at: timestamp
}
```

## Future Enhancements
- Track specific user actions (prayer submissions, updates, etc.)
- Add charts/graphs for visual analytics
- Export analytics data
- Filter by date ranges
- Track unique visitors vs returning visitors
