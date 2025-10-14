# Apply Database Migration - admin_settings Table

## The Issue

You're getting a **406 (Not Acceptable)** error because the `admin_settings` table doesn't exist in your database yet.

## Quick Fix - Apply Migration in Supabase Dashboard

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run This SQL

Copy and paste the entire SQL below, then click **Run**:

```sql
-- Create admin_settings table to store email notification settings
CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  notification_emails TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can read settings
CREATE POLICY "Authenticated users can read admin settings"
  ON admin_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only authenticated users can update settings
CREATE POLICY "Authenticated users can update admin settings"
  ON admin_settings
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Only authenticated users can insert settings
CREATE POLICY "Authenticated users can insert admin settings"
  ON admin_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_settings_updated_at();

-- Insert default row
INSERT INTO admin_settings (id, notification_emails)
VALUES (1, '{}')
ON CONFLICT (id) DO NOTHING;
```

### Step 3: Verify

After running the SQL, you should see a success message. Then:

1. Refresh your app
2. Go to Admin Portal → Settings
3. The 406 error should be gone
4. You can now add admin email addresses

---

## Alternative: Link and Push (Optional)

If you want to use the CLI instead:

```bash
# Link to your Supabase project
supabase link --project-ref eqiafsygvfaifhoaewxi

# Push the migration
supabase db push
```

But the dashboard method above is faster and easier!
