# Email Verification System - Deployment Guide

Complete step-by-step instructions to deploy the email verification (2FA) system to production.

---

## Overview

You have 10 commits ready to deploy that add a complete email verification system to your prayer app. This guide will walk you through the entire deployment process.

---

## ✅ Pre-Deployment Checklist

Before you begin, make sure you have:
- [ ] Supabase project access (project URL and keys)
- [ ] Resend API account with verified domain
- [ ] GitHub repository access (Kelemek/prayerapp)
- [ ] Current code is working locally

---

## Step 1: Push Code to GitHub

Push all 10 commits to your GitHub repository.

```bash
cd /Users/marklarson/Documents/GitHub/prayerapp
git push origin main
```

**Expected output:**
```
Enumerating objects: XX, done.
Counting objects: 100% (XX/XX), done.
...
To github.com:Kelemek/prayerapp.git
   302a0d0..43fff96  main -> main
```

**✅ Verification:** Visit https://github.com/Kelemek/prayerapp/commits/main and confirm you see all 10 new commits.

---

## Step 2: Deploy Edge Functions to Supabase

Deploy the two new Edge Functions that handle verification code sending and validation.

### 2a. Deploy send-verification-code Function

```bash
cd /Users/marklarson/Documents/GitHub/prayerapp
supabase functions deploy send-verification-code
```

**Expected output:**
```
Deploying send-verification-code (project ref: your-project-ref)
Bundled send-verification-code size: XX kB
✓ Deployed Function send-verification-code in XXs
```

### 2b. Deploy verify-code Function

```bash
supabase functions deploy verify-code
```

**Expected output:**
```
Deploying verify-code (project ref: your-project-ref)
Bundled verify-code size: XX kB
✓ Deployed Function verify-code in XXs
```

### 2c. Set Environment Variables for Edge Functions

Both functions need the Resend API key:

```bash
supabase secrets set RESEND_API_KEY=re_your_actual_resend_api_key_here
```

**Get your Resend API key:**
1. Go to https://resend.com/api-keys
2. Copy your API key (starts with `re_`)
3. Replace `re_your_actual_resend_api_key_here` in the command above

**Expected output:**
```
Finished supabase secrets set.
```

**✅ Verification:** 
```bash
supabase secrets list
```
You should see `RESEND_API_KEY` in the list.

---

## Step 3: Run Database Migration

Apply the database migration that creates the verification_codes table and updates admin_settings.

### 3a. Check Current Migration Status

```bash
supabase migration list
```

**Expected output:** Shows existing migrations as applied.

### 3b. Apply New Migration

The migration file is at: `supabase/migrations/20251020_create_verification_codes.sql`

```bash
supabase db push
```

**Expected output:**
```
Applying migration 20251020_create_verification_codes.sql...
✓ Finished supabase db push.
```

### 3c. Verify Database Changes

Log into your Supabase dashboard and check:

1. **New Table Created:**
   - Go to: Table Editor → Look for `verification_codes` table
   - Should have columns: id, email, code, action_type, action_data, expires_at, created_at

2. **Admin Settings Updated:**
   - Go to: Table Editor → `admin_settings` table
   - Should see new columns:
     - `require_email_verification` (boolean, default false)
     - `verification_code_length` (integer, default 6)
     - `verification_code_expiry_minutes` (integer, default 15)

**✅ Verification:** Run this SQL query in Supabase SQL Editor:
```sql
SELECT 
  require_email_verification,
  verification_code_length,
  verification_code_expiry_minutes
FROM admin_settings
WHERE id = 1;
```
Should return one row with default values.

---

## Step 4: Deploy Frontend to Netlify

Build and deploy the React frontend with the new verification components.

### 4a. Build Locally (Optional - Test First)

```bash
npm run build
```

**Expected output:**
```
vite v7.x.x building for production...
✓ XX modules transformed.
dist/index.html                   X.XX kB
...
✓ built in XXs
```

### 4b. Deploy to Netlify

Netlify should auto-deploy when you push to GitHub (if you have CI/CD set up).

**Option A: Automatic Deployment (if configured)**
1. Go to: https://app.netlify.com/sites/your-site/deploys
2. Wait for the deploy to complete (triggered by your git push)
3. Status should change to "Published"

**Option B: Manual Deployment**
```bash
netlify deploy --prod
```

Follow the prompts and select your build directory (`dist` or `build`).

**✅ Verification:** Visit your live site URL and check:
- Site loads without errors
- No console errors in browser dev tools (F12)

---

## Step 5: Configure Admin Settings

Enable and configure the email verification system through the Admin Portal.

### 5a. Access Admin Portal

1. Go to your live site: `https://your-site.netlify.app`
2. Click the admin icon (⚙️) in the top right
3. Navigate to **Email Settings** tab

### 5b. Configure Verification Settings

You'll see a new section: **Email Verification Requirement (2FA)**

1. **Enable Verification:**
   - ☑️ Check the "Require Email Verification (2FA)" checkbox

2. **Configure Code Length** (optional):
   - Default: 6 digits (recommended)
   - Options: 4, 6, or 8 digits
   - Longer = more secure but harder to type

3. **Configure Expiration Time** (optional):
   - Default: 15 minutes (recommended)
   - Range: 5-60 minutes
   - Shorter = more secure but less user-friendly

4. **Save Settings:**
   - Click the green "Save Settings" button
   - Wait for confirmation message

**Recommended Settings for Production:**
- ☑️ Verification enabled
- Code length: **6 digits**
- Expiration: **15 minutes**

**✅ Verification:** Refresh the page and confirm your settings are still applied.

---

## Step 6: Test the System

Thoroughly test the verification flow before announcing to users.

### 6a. Test Prayer Submission

1. Go to your site (logged out or incognito mode)
2. Click "New Prayer Request"
3. Fill out the form with a **real email you can access**
4. Click "Submit Prayer"

**Expected behavior:**
- A dialog appears: "Verify Your Email"
- Shows your email address
- Has 6 input boxes for the code
- Shows countdown timer (expires in X minutes)

5. **Check your email inbox**
   - Subject: "Verify Your Email - Prayer Request"
   - Body contains 6-digit code
   - From: noreply@yourdomain.com

6. **Enter the code** in the dialog
7. Click "Verify Code" (or it auto-submits)

**Expected result:**
- Dialog closes
- Success message appears
- Prayer is submitted to pending list

### 6b. Test Invalid/Expired Code

1. Submit another prayer request
2. Wait for verification email
3. **Enter wrong code** (e.g., 111111)

**Expected behavior:**
- Error message: "Invalid or expired verification code"
- Can try again
- Can click "Resend Code" to get new code

### 6c. Test Resend Functionality

1. Submit another prayer request
2. Click **"Resend Code"** button in the dialog
3. Check email for new code

**Expected behavior:**
- Button shows loading state
- New email arrives with different code
- Old code is invalidated
- New countdown timer starts

### 6d. Test All Form Types

Repeat verification testing for:
- ✅ Prayer submission (new request)
- ✅ Prayer update
- ✅ Prayer deletion request
- ✅ Update deletion request  
- ✅ Status change request
- ✅ Email preference changes

**All should require verification when enabled.**

### 6e. Test Disabling Verification

1. Go to Admin Portal → Email Settings
2. ☐ Uncheck "Require Email Verification (2FA)"
3. Save settings
4. Try submitting a prayer

**Expected behavior:**
- No verification dialog appears
- Prayer submits immediately
- System works as before

---

## Step 7: Monitor and Troubleshoot

Set up monitoring and know how to troubleshoot common issues.

### 7a. Monitor Edge Function Logs

Watch for errors in real-time:

```bash
supabase functions logs send-verification-code
```

```bash
supabase functions logs verify-code
```

**Or** check in Supabase Dashboard:
- Edge Functions → Select function → View logs

### 7b. Monitor Database

Check the `verification_codes` table periodically:

```sql
-- See recent verification attempts
SELECT 
  email,
  action_type,
  created_at,
  expires_at,
  CASE 
    WHEN expires_at > NOW() THEN 'Active'
    ELSE 'Expired'
  END as status
FROM verification_codes
ORDER BY created_at DESC
LIMIT 20;
```

### 7c. Common Issues & Solutions

#### Issue: "Failed to send verification code"

**Possible causes:**
- Resend API key not set
- Resend API key invalid
- Email domain not verified in Resend

**Solutions:**
1. Check Edge Function logs: `supabase functions logs send-verification-code`
2. Verify Resend API key is set: `supabase secrets list`
3. Verify domain in Resend: https://resend.com/domains
4. Check Resend dashboard for delivery errors

#### Issue: "Code not arriving in email"

**Possible causes:**
- Email in spam folder
- Email address typo
- Resend delivery delay

**Solutions:**
1. Check spam/junk folder
2. Wait 1-2 minutes (sometimes delayed)
3. Check Resend dashboard → Emails for delivery status
4. Click "Resend Code" to try again

#### Issue: "Invalid or expired code" (but code is correct)

**Possible causes:**
- Code already used
- Code expired (past expiration time)
- Clock skew between server and client

**Solutions:**
1. Click "Resend Code" to get fresh code
2. Check code expiration timer in dialog
3. Use code immediately after receiving

#### Issue: Verification dialog not appearing

**Possible causes:**
- Verification not enabled in admin settings
- JavaScript error on page
- Component not properly deployed

**Solutions:**
1. Check Admin Portal → Email Settings → Verification enabled
2. Open browser console (F12) → Check for errors
3. Hard refresh page (Ctrl+Shift+R or Cmd+Shift+R)
4. Verify frontend deployed successfully

---

## Step 8: Cleanup Old Codes (Optional but Recommended)

Set up automatic cleanup of expired verification codes to keep your database clean.

### Option A: Manual Cleanup Query

Run this periodically in Supabase SQL Editor:

```sql
-- Delete codes older than 24 hours
DELETE FROM verification_codes
WHERE created_at < NOW() - INTERVAL '24 hours';
```

### Option B: Scheduled Database Function (Recommended)

Create a database function that auto-deletes old codes:

```sql
-- Create function
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Schedule it to run daily (requires pg_cron extension)
-- Note: pg_cron may not be available on all Supabase plans
SELECT cron.schedule(
  'cleanup-verification-codes',
  '0 2 * * *', -- 2 AM every day
  'SELECT cleanup_expired_verification_codes()'
);
```

---

## Step 9: User Communication (Optional)

If you want to announce this feature to your users:

### Sample Announcement

> **New Security Feature: Email Verification**
> 
> We've added email verification to protect against spam and ensure all requests come from real email addresses. When you submit a prayer request or make changes, you'll receive a verification code via email that you'll need to enter to complete your action.
> 
> This helps us:
> - Prevent spam submissions
> - Verify email addresses are real
> - Ensure you have access to the email you provide
> 
> The process is quick and easy - just check your email and enter the code!

---

## Step 10: Post-Deployment Verification

Final checks to ensure everything is working correctly.

### Complete Checklist

- [ ] All 10 commits pushed to GitHub
- [ ] Both Edge Functions deployed and accessible
- [ ] RESEND_API_KEY secret set correctly
- [ ] Database migration applied successfully
- [ ] Frontend deployed to Netlify
- [ ] Admin settings accessible and saveable
- [ ] Verification enabled in admin portal
- [ ] Test email received with code
- [ ] Code verification works correctly
- [ ] Resend functionality works
- [ ] All 6 form types require verification
- [ ] Disabling verification works
- [ ] No console errors in browser
- [ ] Edge Function logs show no errors
- [ ] Database queries work correctly

---

## Quick Reference Commands

### Git Commands
```bash
git status                    # Check current state
git log --oneline -10        # View recent commits
git push origin main         # Push to GitHub
```

### Supabase Commands
```bash
supabase functions deploy send-verification-code
supabase functions deploy verify-code
supabase secrets set RESEND_API_KEY=your_key
supabase secrets list
supabase db push
supabase functions logs send-verification-code
```

### Build Commands
```bash
npm install                  # Install dependencies
npm run dev                  # Run locally
npm run build               # Build for production
npm run lint                # Check for code issues
```

---

## Support & Troubleshooting

### Documentation Files
- `EMAIL_VERIFICATION_IMPLEMENTATION.md` - System architecture and design
- `DEPLOYMENT_CHECKLIST.md` - Detailed deployment steps
- `docs/FEATURES.md` - Feature overview
- `docs/TROUBLESHOOTING.md` - General troubleshooting

### Useful Links
- Supabase Dashboard: https://app.supabase.com
- Resend Dashboard: https://resend.com/emails
- Netlify Dashboard: https://app.netlify.com
- GitHub Repository: https://github.com/Kelemek/prayerapp

### Getting Help
If you encounter issues:
1. Check browser console for errors (F12)
2. Check Edge Function logs in Supabase
3. Check Resend dashboard for email delivery status
4. Review the troubleshooting section above
5. Check database migration was applied correctly

---

## Success Criteria

You'll know the deployment is successful when:
✅ Users can submit prayers and receive verification codes
✅ Codes arrive within 1-2 minutes
✅ Valid codes are accepted and prayers are submitted
✅ Invalid codes show proper error messages
✅ Resend functionality works
✅ Admin can enable/disable verification
✅ All 6 form types work with verification
✅ No errors in browser console or Edge Function logs

---

**🎉 Congratulations!** Your email verification system is now live and protecting your prayer app from spam!

---

## Next Steps (Optional Enhancements)

Consider these future improvements:
- [ ] Add rate limiting (max X codes per email per hour)
- [ ] Add admin dashboard to view verification statistics
- [ ] Add email template customization
- [ ] Add SMS verification as alternative to email
- [ ] Add remember device option (skip verification for 30 days)
- [ ] Add admin notifications for suspicious activity

---

**Last Updated:** October 20, 2025
**System Version:** 1.0.0
**Status:** Production Ready ✅
