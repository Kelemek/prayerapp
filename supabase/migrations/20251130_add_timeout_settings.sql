-- Add timeout configuration columns to admin_settings table
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS inactivity_timeout_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS max_session_duration_minutes INTEGER DEFAULT 480,
ADD COLUMN IF NOT EXISTS db_heartbeat_interval_minutes INTEGER DEFAULT 1;

-- Add constraints to ensure valid values
ALTER TABLE admin_settings
ADD CONSTRAINT inactivity_timeout_min CHECK (inactivity_timeout_minutes >= 5),
ADD CONSTRAINT max_session_duration_min CHECK (max_session_duration_minutes >= 30),
ADD CONSTRAINT db_heartbeat_interval_min CHECK (db_heartbeat_interval_minutes >= 1);
