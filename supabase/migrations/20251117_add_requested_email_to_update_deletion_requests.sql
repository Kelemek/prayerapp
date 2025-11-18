-- Add requested_email column to update_deletion_requests table
ALTER TABLE update_deletion_requests 
ADD COLUMN IF NOT EXISTS requested_email VARCHAR(255);

COMMENT ON COLUMN update_deletion_requests.requested_email IS 'Email address of the person requesting the update deletion';
