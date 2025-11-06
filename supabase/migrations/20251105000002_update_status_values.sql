-- Migration to update prayer statuses: change both 'ongoing' and 'closed' to 'archived'
-- Date: 2025-11-05

-- Step 1: Drop the old check constraint
ALTER TABLE prayers DROP CONSTRAINT IF EXISTS prayers_status_check;

-- Step 2: Update all 'ongoing' prayers to 'archived'
UPDATE prayers 
SET status = 'archived' 
WHERE status = 'ongoing';

-- Step 3: Update all 'closed' prayers to 'archived'
UPDATE prayers 
SET status = 'archived' 
WHERE status = 'closed';

-- Step 4: Add new check constraint with only the three allowed statuses
ALTER TABLE prayers ADD CONSTRAINT prayers_status_check 
CHECK (status IN ('current', 'answered', 'archived'));

-- Step 5: Update any pending status change requests with 'ongoing' or 'closed' statuses to 'archived'
UPDATE status_change_requests 
SET requested_status = 'archived' 
WHERE requested_status = 'ongoing';

UPDATE status_change_requests 
SET requested_status = 'archived' 
WHERE requested_status = 'closed';

-- Add comment explaining the change
COMMENT ON COLUMN prayers.status IS 'Prayer status: current, answered, or archived';
