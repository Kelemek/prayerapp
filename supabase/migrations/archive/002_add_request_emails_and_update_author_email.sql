-- Add email columns to support requester and update author emails

ALTER TABLE prayer_updates
ADD COLUMN IF NOT EXISTS author_email TEXT NULL;

ALTER TABLE deletion_requests
ADD COLUMN IF NOT EXISTS requested_email TEXT NULL;

ALTER TABLE status_change_requests
ADD COLUMN IF NOT EXISTS requested_email TEXT NULL;

ALTER TABLE update_deletion_requests
ADD COLUMN IF NOT EXISTS requested_email TEXT NULL;

-- Optional: create indexes for faster lookups by email
CREATE INDEX IF NOT EXISTS idx_prayer_updates_author_email ON prayer_updates(author_email);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_requested_email ON deletion_requests(requested_email);
CREATE INDEX IF NOT EXISTS idx_status_change_requests_requested_email ON status_change_requests(requested_email);
CREATE INDEX IF NOT EXISTS idx_update_deletion_requests_requested_email ON update_deletion_requests(requested_email);
