-- Create backup_logs table to track backup history and keep database active
CREATE TABLE IF NOT EXISTS backup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_date timestamp with time zone NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'in_progress')),
  tables_backed_up jsonb,
  total_records integer,
  error_message text,
  duration_seconds integer,
  created_at timestamp with time zone DEFAULT now()
);

-- Add index for quick lookup of latest backup
CREATE INDEX idx_backup_logs_backup_date ON backup_logs(backup_date DESC);

-- Add RLS policies
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can read backup logs (for admin display)
CREATE POLICY "Anyone can read backup logs"
  ON backup_logs
  FOR SELECT
  USING (true);

-- Only service role can insert backup logs (via API)
CREATE POLICY "Service role can insert backup logs"
  ON backup_logs
  FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE backup_logs IS 'Tracks automated backup history and keeps database active for free tier';
