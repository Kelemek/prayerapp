# Admin User Management - Quick Setup

## 1. Apply Database Migration

Go to your Supabase project dashboard → SQL Editor and run:

```sql
-- Add admin tracking fields to email_subscribers table
ALTER TABLE email_subscribers 
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP WITH TIME ZONE;

-- Create index on is_admin for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_email_subscribers_admin ON email_subscribers(is_admin) WHERE is_admin = true;

-- Create a function to update last_sign_in_at when admin logs in
CREATE OR REPLACE FUNCTION update_admin_last_sign_in(admin_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE email_subscribers
  SET last_sign_in_at = TIMEZONE('utc', NOW())
  WHERE email = admin_email AND is_admin = true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_admin_last_sign_in(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_last_sign_in(TEXT) TO anon;

-- Add a comment
COMMENT ON FUNCTION update_admin_last_sign_in IS 'Updates the last_sign_in_at timestamp for admin users';
```

## 2. Test the Feature

1. Sign in to admin portal
2. Go to **Settings** tab
3. Scroll to **Admin User Management** section
4. Click **Add Admin**
5. Enter:
   - Name: Test Admin
   - Email: test@example.com
6. Click **Add & Send Invitation**
7. Verify the admin appears in the list

## 3. Check Invitation Email

The new admin should receive an email with:
- Welcome message
- List of admin capabilities
- Instructions for signing in
- Link to admin portal

## Notes

- The migration file is: `supabase/migrations/20251102000001_add_admin_tracking.sql`
- Requires `send-notification` Edge Function to be deployed
- Uses existing Resend email configuration
- Cannot delete the last admin user (safety feature)

## What's New

✅ View all current admins
✅ Add new admins with email validation
✅ Send automated invitation emails
✅ Remove admin access
✅ Track last sign-in date
✅ Full dark mode support
✅ Responsive mobile design
