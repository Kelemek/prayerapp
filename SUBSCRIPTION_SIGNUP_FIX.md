# Email Subscription Signup Issue - Diagnostic & Fix

## Problem
Getting "Edge Function returned a non-2xx status code" when trying to add a new email address for subscription preferences.

## Root Cause
The change subscription preference feature **CAN** be used to sign up for email subscriptions. It works through an approval workflow:

1. User enters email + preferences → saves to `pending_preference_changes`
2. Admin approves → creates/updates record in `email_subscribers`
3. User is now subscribed and their preferences are active

However, if email verification is enabled, the system tries to send a verification code via the `send-verification-code` Edge Function, which may be failing.

## Quick Fix: Disable Email Verification for Preference Changes

### Option 1: Disable Email Verification Completely
1. Go to Admin Settings in your app
2. Find "Require Email Verification" setting
3. Uncheck it and save
4. Try adding the email subscription again

### Option 2: Check Edge Function Configuration
The Edge Function requires these environment variables in Supabase:

1. Go to Supabase Dashboard → Project Settings → Edge Functions
2. Verify these secrets are set:
   - `RESEND_API_KEY` - Your Resend API key
   - `RESEND_FROM_EMAIL` - Your verified sender email
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key

### Option 3: Check Browser Console for Detailed Error

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Try to add the email subscription again
4. Look for error messages that show more details

Common errors:
- **Missing RESEND_API_KEY**: Edge Function can't send email
- **Invalid email format**: Edge Function validates email format
- **Database permission**: Check RLS policies

## How the Subscription Signup Works

### For New Email Addresses:
1. User enters name + email in Settings
2. Checks "Receive notifications" checkbox
3. Clicks Save
4. **If verification enabled**: User must enter code from email
5. **If verification disabled OR recently verified**: Skips straight to approval
6. Request saved to `pending_preference_changes` table
7. Admin gets notification email
8. Admin reviews in Admin Settings → Pending Changes
9. Admin clicks Approve
10. Record created in `email_subscribers` with `is_active: true`
11. User receives approval confirmation email
12. User is now subscribed!

### For Existing Email Addresses:
- Same flow, but updates existing `email_subscribers` record
- Can toggle `is_active` on/off
- Can update name

## Testing Without Verification

To test the signup flow without email verification:

```sql
-- Run this in Supabase SQL Editor to disable verification
UPDATE admin_settings 
SET require_email_verification = false 
WHERE id = 1;
```

Then try the subscription signup again.

## Verification Code Debugging

If you want to keep verification enabled, check the Edge Function logs:

1. Supabase Dashboard → Edge Functions → send-verification-code
2. Click on "Logs" tab
3. Look for error messages when trying to add subscription

Common issues:
- Resend API key not set or invalid
- Email domain not verified in Resend
- Rate limiting from Resend

## Alternative: Direct Database Insert (Admin Only)

If you just need to add a subscriber quickly, you can do it directly in Supabase:

```sql
-- Add a new subscriber directly (admin only)
INSERT INTO email_subscribers (name, email, is_active, is_admin)
VALUES ('User Name', 'user@example.com', true, false);
```

This bypasses the approval workflow and verification.
