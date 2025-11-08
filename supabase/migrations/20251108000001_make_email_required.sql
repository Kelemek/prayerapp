-- Make email field required in prayers table
-- Email is collected even for anonymous prayers, so it should not be nullable

-- First, update any existing NULL emails to a placeholder (if any exist)
-- This ensures the NOT NULL constraint can be applied
UPDATE prayers 
SET email = 'no-email@placeholder.com' 
WHERE email IS NULL;

-- Add NOT NULL constraint to email column
ALTER TABLE prayers 
ALTER COLUMN email SET NOT NULL;

-- Update author_email in prayer_updates to be NOT NULL as well
-- since updates should also include email addresses
UPDATE prayer_updates 
SET author_email = 'no-email@placeholder.com' 
WHERE author_email IS NULL;

ALTER TABLE prayer_updates 
ALTER COLUMN author_email SET NOT NULL;

-- Update requested_email in deletion_requests to be NOT NULL
-- since deletion requests should also include email addresses
UPDATE deletion_requests 
SET requested_email = 'no-email@placeholder.com' 
WHERE requested_email IS NULL;

ALTER TABLE deletion_requests 
ALTER COLUMN requested_email SET NOT NULL;
