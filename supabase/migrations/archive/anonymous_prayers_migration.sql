-- Migration: Add email and anonymous functionality to prayers
-- Run this SQL in your Supabase SQL editor to add new fields

-- Add email and is_anonymous columns to prayers table
ALTER TABLE prayers 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Create index on email for admin searches (optional)
CREATE INDEX IF NOT EXISTS idx_prayers_email ON prayers(email);

-- Create index on is_anonymous for filtering
CREATE INDEX IF NOT EXISTS idx_prayers_is_anonymous ON prayers(is_anonymous);

-- Update existing prayers to not be anonymous by default
UPDATE prayers SET is_anonymous = false WHERE is_anonymous IS NULL;