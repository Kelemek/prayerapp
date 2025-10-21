# Reply-To Email Feature - Restored

## Overview
This feature allows admins to configure a custom reply-to email address for all notification emails sent from the prayer app, for both Mailchimp (mass emails) and Resend (admin transactional emails). It also includes a test email function to verify Mailchimp integration.

## Changes Made

### 1. Database Migration
**File:** `supabase/migrations/20251020_add_reply_to_email.sql`

Added `reply_to_email` column to `admin_settings` table with default value of `markdlarson@me.com`.

### 2. Email Settings Component
**File:** `src/components/EmailSettings.tsx`

- Added `replyToEmail` state variable
- Loads `reply_to_email` from database on component mount
- Saves `reply_to_email` when settings are updated
- Added UI input field for Reply-To Email Address with help text
- Added `sendTestEmail()` function to test Mailchimp integration
- Added "Send Test Email" button (only enabled in "All Users" mode)
- Added success message display for test emails

### 3. Email Notifications
**File:** `src/lib/emailNotifications.ts`

- Updated `invokeSendNotification()` function signature to accept optional `replyTo` parameter
- Updated `sendApprovedPrayerNotification()` to:
  - Fetch `reply_to_email` from admin_settings
  - Pass it to both Resend (admin_only mode) and Mailchimp (all_users mode)
- Updated `sendMailchimpCampaign()` to:
  - Fetch `reply_to_email` from admin_settings
  - Use it in Mailchimp campaign instead of hardcoded value

## Setup Required

### 1. Run Database Migration
```sql
-- In Supabase SQL Editor
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS reply_to_email TEXT;

UPDATE admin_settings 
SET reply_to_email = 'markdlarson@me.com' 
WHERE id = 1 AND reply_to_email IS NULL;
```

Or use the migration file:
```bash
# Apply via Supabase CLI (if using migrations)
supabase db reset
```

### 2. Configure in UI
1. Go to Admin Portal → Settings
2. Scroll to "Email Distribution Settings"
3. Select "All Users" (required for Mailchimp)
4. Find "Reply-To Email Address" field
5. Enter your desired reply-to email (e.g., `markdlarson@me.com`)
6. Click "Save Distribution Settings"

### 3. Test Mailchimp Integration
1. In the same Email Distribution Settings section
2. Click "Send Test Email" button
3. Check all Mailchimp subscriber inboxes for test email
4. Verify email arrives and reply-to is correct
5. Success message will appear if sent successfully

**Note:** Test email button is only enabled when "All Users" distribution mode is selected.

### 4. Verify in Mailchimp
**Important:** The reply-to email must be verified in Mailchimp to avoid errors.

1. Go to Mailchimp Dashboard
2. Navigate to Settings → Verified Domains
3. Verify your email domain
4. Or verify individual email addresses

## Benefits

✅ **Centralized Management** - Change reply-to email from Admin Portal UI  
✅ **Works with Both Services** - Applies to both Mailchimp and Resend emails  
✅ **No Hardcoded Emails** - No need to update code to change reply-to address  
✅ **Database-Backed** - Settings persist across deployments  
✅ **Test Function** - Send test emails to verify Mailchimp integration works  

## Usage

When a prayer is approved:
- **Admin Only Mode (Resend)** → Uses `reply_to_email` from database
- **All Users Mode (Mailchimp)** → Uses `reply_to_email` from database

Recipients can reply to notification emails and it will go to the configured address.

## Default Value

If no reply-to email is set, defaults to: `markdlarson@me.com`

## Testing

### Test Mailchimp Integration
1. Go to Admin Portal → Settings
2. Set email distribution to "All Users"
3. Set reply-to email address
4. Click "Send Test Email" button
5. Check all Mailchimp subscriber inboxes
6. Verify test email arrives with correct reply-to

### Test in Production
1. Set reply-to email in Admin Portal
2. Approve a prayer request
3. Check received email headers
4. Verify "Reply-To" field contains your configured email
5. Try replying to the email to confirm it goes to correct address
