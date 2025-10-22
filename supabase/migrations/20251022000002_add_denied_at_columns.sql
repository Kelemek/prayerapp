-- Add denied_at columns to prayers and prayer_updates tables
-- This will enable proper audit tracking of when items were denied

-- Add denied_at column to prayers table
ALTER TABLE prayers 
ADD COLUMN denied_at TIMESTAMP WITH TIME ZONE;

-- Add denied_at column to prayer_updates table  
ALTER TABLE prayer_updates 
ADD COLUMN denied_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN prayers.denied_at IS 'Timestamp when the prayer was denied by an admin';
COMMENT ON COLUMN prayer_updates.denied_at IS 'Timestamp when the prayer update was denied by an admin';

-- Note: These columns will be populated by the application when denial occurs
-- They remain NULL for approved or pending items