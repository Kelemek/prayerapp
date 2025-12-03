-- Enable RLS on email_subscribers table
-- This migration fixes the issue where RLS policies exist but RLS is not enabled
-- Without RLS enabled, the policies have no effect and the table is unprotected

-- Enable Row Level Security on email_subscribers
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- Verify: After running this migration, the existing policies will take effect:
-- - "Allow authenticated to delete email subscribers"
-- - "Allow authenticated to insert email subscribers"
-- - "Allow authenticated to select email subscribers"
-- - "Allow authenticated to update email subscribers"
-- - "Allow service role to delete email subscribers"
-- - "Allow service role to insert email subscribers"
-- - "Allow service role to select email subscribers"
-- - "Allow service role to update email subscribers"
-- - "Anonymous users can check approval status"
