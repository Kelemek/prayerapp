# Email Verification System - Troubleshooting Guide

The verification dialog isn't showing when submitting a prayer request. Here's how to fix it:

## Step 1: Apply the Database Migration

The migration hasn't been applied to your Supabase database yet. You need to run it.

### Option A: Using Supabase Dashboard (RECOMMENDED - EASIEST)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the ENTIRE contents of `supabase/migrations/20251020_create_verification_codes.sql`
6. Paste it into the SQL editor
7. Click **Run** (or press Cmd+Enter)
8. You should see "Success. No rows returned"

### Option B: Using Supabase CLI

```bash
# If you have Supabase CLI installed
cd /Users/marklarson/Documents/GitHub/prayerapp
supabase db push

# Or apply the specific migration
supabase migration up
```

## Step 2: Enable Email Verification in Admin Portal

After the migration is applied:

1. Open your prayer app in the browser
2. Go to the **Admin Portal** (click the gear icon)
3. Click on **Email Settings** tab
4. Scroll down to find **"Require Email Verification (2FA)"**
5. **Check the checkbox** to enable it
6. Configure the settings (optional):
   - **Verification Code Length**: Choose 4, 6, or 8 digits (6 is recommended)
   - **Code Expiration Time**: Choose 5-60 minutes (15 is recommended)
7. Click **Save Settings** at the bottom

## Step 3: Verify Edge Functions Are Deployed

The verification system needs two Edge Functions to work:

### Check if they exist:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on **Edge Functions** in the left sidebar
4. You should see:
   - `send-verification-code`
   - `verify-code`

### If they DON'T exist, deploy them:

```bash
cd /Users/marklarson/Documents/GitHub/prayerapp

# Deploy send-verification-code
supabase functions deploy send-verification-code

# Deploy verify-code
supabase functions deploy verify-code
```

### Set the required secrets:

```bash
# Set Resend API key (for sending emails)
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```

## Step 4: Test the Verification Flow

1. Open your prayer app
2. Click **"Submit a Prayer Request"**
3. Fill out the form with your email
4. Click **Submit**
5. You should now see a **Verification Dialog** asking for a code
6. Check your email for the verification code
7. Enter the code and submit

## Common Issues & Solutions

### Issue 1: "require_email_verification column doesn't exist"
**Solution**: The migration wasn't applied. Go back to Step 1.

### Issue 2: Verification dialog shows but no email arrives
**Causes**:
- Edge Functions not deployed (Step 3)
- RESEND_API_KEY not set (Step 3)
- Wrong reply-to email in admin settings

**Solution**: 
1. Check Edge Functions are deployed
2. Check secrets: `supabase secrets list`
3. Check browser console for errors (F12 → Console tab)

### Issue 3: Dialog doesn't show even though setting is enabled
**Causes**:
- Browser cache showing old version of the app
- Setting wasn't saved properly

**Solution**:
1. Hard refresh the browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Check the setting is still checked in Admin Portal
3. Open browser console (F12) and check for JavaScript errors

### Issue 4: "Invalid or expired code" error
**Causes**:
- Code expired (default is 15 minutes)
- Wrong code entered
- Code already used

**Solution**:
- Click "Resend Code" button
- Check your email for the NEW code
- Make sure you're entering all digits correctly

## Quick Verification Checklist

Run through this checklist to ensure everything is set up:

- [ ] Migration applied to database (Step 1)
- [ ] `require_email_verification` column exists in `admin_settings` table
- [ ] Email verification **enabled** in Admin Portal (checkbox checked)
- [ ] Edge Function `send-verification-code` deployed
- [ ] Edge Function `verify-code` deployed
- [ ] `RESEND_API_KEY` secret set in Supabase
- [ ] Reply-to email configured in Admin Portal Email Settings
- [ ] Hard refreshed browser to clear cache

## Testing Database Directly

If you want to verify the migration was applied, you can check in Supabase Dashboard:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Table Editor** → **admin_settings**
4. You should see these columns:
   - `require_email_verification` (boolean)
   - `verification_code_length` (integer)
   - `verification_code_expiry_minutes` (integer)
5. Click **SQL Editor** and run:
   ```sql
   SELECT require_email_verification, verification_code_length, verification_code_expiry_minutes 
   FROM admin_settings 
   WHERE id = 1;
   ```
6. This should return one row with the current settings

## Expected Behavior When Working

1. User fills out prayer request form
2. User clicks **Submit**
3. **Verification dialog appears** (if enabled)
4. Email sent to user with 6-digit code
5. User enters code in dialog
6. Code is verified
7. Prayer request is submitted
8. Success message appears

## Still Not Working?

If you've completed all steps and it's still not working:

1. **Check browser console** (F12 → Console tab) for errors
2. **Check Edge Function logs** in Supabase Dashboard → Edge Functions
3. **Check if the setting is actually enabled**:
   - SQL Editor → Run: `SELECT * FROM admin_settings WHERE id = 1;`
   - Look for `require_email_verification` column, should be `true`

## Contact/Support

If you need help:
- Check browser console errors
- Check Edge Function logs
- Check Supabase database to verify migration applied
- Review the implementation docs in `EMAIL_VERIFICATION_IMPLEMENTATION.md`
