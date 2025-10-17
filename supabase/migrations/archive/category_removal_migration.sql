-- Migration: Remove category functionality from prayers table
-- Run this SQL in your Supabase SQL editor to remove category column and related indexes

-- IMPORTANT: Run this migration in your Supabase SQL editor to fix prayer submission issues

-- Step 1: First, if the column exists and has NOT NULL constraint, we need to make it nullable first
-- This prevents errors if there are existing prayers
ALTER TABLE prayers ALTER COLUMN category DROP NOT NULL;

-- Step 2: Drop the category column completely
ALTER TABLE prayers DROP COLUMN IF EXISTS category;

-- Step 3: Drop the category index if it exists
DROP INDEX IF EXISTS idx_prayers_category;

-- The approval system and other functionality remains intact

-- After running this migration, the "Submit Prayer Request" button should work properly