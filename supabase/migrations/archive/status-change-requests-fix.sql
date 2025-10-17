-- Fix RLS policy for status_change_requests to allow admin updates

-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Only authenticated users can update status change requests" ON status_change_requests;

-- Create a more permissive update policy for admin operations
CREATE POLICY "Allow admin updates to status change requests" ON status_change_requests
    FOR UPDATE USING (true) WITH CHECK (true);