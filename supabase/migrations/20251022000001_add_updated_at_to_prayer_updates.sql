-- Add updated_at column to prayer_updates table
-- This will enable tracking when updates are modified (e.g., when denied)

-- Add the column with a default value and set it to NOT NULL
ALTER TABLE prayer_updates 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;

-- Set the default value to the current timestamp for future records
ALTER TABLE prayer_updates 
ALTER COLUMN updated_at SET DEFAULT now();

-- Set existing records' updated_at to match their created_at
UPDATE prayer_updates 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Make the column NOT NULL after setting values
ALTER TABLE prayer_updates 
ALTER COLUMN updated_at SET NOT NULL;

-- Create a trigger to automatically update the updated_at column when records are modified
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger on prayer_updates table
DROP TRIGGER IF EXISTS update_prayer_updates_updated_at ON prayer_updates;
CREATE TRIGGER update_prayer_updates_updated_at 
    BEFORE UPDATE ON prayer_updates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON COLUMN prayer_updates.updated_at IS 'Timestamp when the prayer update was last modified (automatically updated on changes)';