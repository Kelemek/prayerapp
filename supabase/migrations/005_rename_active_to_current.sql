-- Change 'active' status to 'current' in prayers table

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE prayers DROP CONSTRAINT IF EXISTS prayers_status_check;

-- Step 2: Update all existing 'active' records to 'current'
UPDATE prayers SET status = 'current' WHERE status = 'active';

-- Step 3: Add new CHECK constraint with 'current' instead of 'active'
ALTER TABLE prayers ADD CONSTRAINT prayers_status_check 
  CHECK (status IN ('current', 'ongoing', 'answered', 'closed'));

-- Step 4: Update the default value
ALTER TABLE prayers ALTER COLUMN status SET DEFAULT 'current';
