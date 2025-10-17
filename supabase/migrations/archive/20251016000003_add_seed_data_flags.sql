-- Add is_seed_data column to prayers table
ALTER TABLE prayers 
ADD COLUMN IF NOT EXISTS is_seed_data BOOLEAN DEFAULT false;

-- Add is_seed_data column to prayer_updates table
ALTER TABLE prayer_updates 
ADD COLUMN IF NOT EXISTS is_seed_data BOOLEAN DEFAULT false;

-- Create index for faster seed data queries
CREATE INDEX IF NOT EXISTS idx_prayers_is_seed_data ON prayers(is_seed_data) WHERE is_seed_data = true;
CREATE INDEX IF NOT EXISTS idx_prayer_updates_is_seed_data ON prayer_updates(is_seed_data) WHERE is_seed_data = true;

-- Add comment to explain the column purpose
COMMENT ON COLUMN prayers.is_seed_data IS 'Marks test/dummy data inserted via development seed functions';
COMMENT ON COLUMN prayer_updates.is_seed_data IS 'Marks test/dummy data inserted via development seed functions';
