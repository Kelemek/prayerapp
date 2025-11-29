-- Create a view that lists all user tables (excludes system tables)
-- This can be used by backup scripts to automatically discover tables
-- Uses SECURITY INVOKER to respect the permissions of the querying user

CREATE OR REPLACE VIEW backup_tables WITH (security_invoker = true) AS
SELECT 
  tablename as table_name,
  schemaname as schema_name
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%'
  -- Exclude views and system tables
  AND tablename IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  )
ORDER BY tablename;

-- Add comment
COMMENT ON VIEW backup_tables IS 'Lists all user tables in public schema for automatic backup discovery';

-- Grant access
GRANT SELECT ON backup_tables TO anon, authenticated, service_role;

-- Add RLS (views inherit from underlying tables, but we can be explicit)
-- Note: This is a view, so RLS doesn't apply directly, but good practice
