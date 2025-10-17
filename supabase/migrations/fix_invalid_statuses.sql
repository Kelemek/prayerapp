-- Fix prayers with 'active' status (if any exist)
-- This migration updates any prayers that have 'active' status to 'current'

-- First, check if there are any prayers with 'active' status
SELECT id, title, status 
FROM prayers 
WHERE status NOT IN ('current', 'ongoing', 'answered', 'closed');

-- Update any 'active' status to 'current'
UPDATE prayers 
SET status = 'current' 
WHERE status = 'active';

-- Also check status_change_requests for invalid statuses
SELECT id, requested_status 
FROM status_change_requests 
WHERE requested_status NOT IN ('current', 'ongoing', 'answered', 'closed');

-- Clean up any invalid status change requests
DELETE FROM status_change_requests 
WHERE requested_status NOT IN ('current', 'ongoing', 'answered', 'closed');
