-- Debug: Check constraint and find any 'active' references

-- 1. Check the exact constraint definition
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'status_change_requests'::regclass 
AND conname LIKE '%status_check%';

-- 2. Check if there are any prayers with 'active' status
SELECT id, title, status 
FROM prayers 
WHERE status = 'active'
LIMIT 10;

-- 3. Test inserting 'current' directly
DO $$
BEGIN
  -- Try to insert a test record with 'current' status
  INSERT INTO status_change_requests (
    prayer_id, 
    requested_status, 
    reason, 
    requested_by, 
    approval_status
  )
  SELECT 
    id,
    'current',
    'Test insertion',
    'Test User',
    'pending'
  FROM prayers 
  LIMIT 1;
  
  RAISE NOTICE 'Successfully inserted test record with current status';
  
  -- Clean up test record
  DELETE FROM status_change_requests WHERE reason = 'Test insertion';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting: %', SQLERRM;
END $$;
