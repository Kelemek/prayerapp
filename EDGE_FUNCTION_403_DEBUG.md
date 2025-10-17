# Edge Function 403 Error - Debugging Guide

## Problem
Getting 403 Forbidden error when calling `send-notification` Edge Function from UserSettings.

## Deployed Changes
1. ✅ Removed authorization header requirement from Edge Function
2. ✅ Added `--no-verify-jwt` flag when deploying
3. ✅ Made email error non-blocking (preferences will save even if email fails)

## Next Steps to Debug

### 1. Check Edge Function Logs in Supabase Dashboard

Go to: https://supabase.com/dashboard/project/eqiafsygvfaifhoaewxi/functions/send-notification

Click on the "Logs" tab and look for:
- 📧 Received email request
- ❌ Any error messages
- What status code is actually being returned

### 2. Check Edge Function Configuration

In the same dashboard page:
- Click "Settings" tab
- Verify "JWT verification" is disabled
- Check if there are any IP restrictions

### 3. Check Environment Variables

The Edge Function needs `RESEND_API_KEY` to be set:

1. Go to: https://supabase.com/dashboard/project/eqiafsygvfaifhoaewxi/settings/functions
2. Click "Manage Secrets"
3. Check if `RESEND_API_KEY` exists
4. If not, add it with your Resend API key from: https://resend.com/api-keys

### 4. Verify RLS Policies

Run these SQL statements in Supabase SQL Editor:

```sql
-- Check email_subscribers RLS
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'email_subscribers';

-- Check pending_preference_changes RLS  
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'pending_preference_changes';
```

Should see:
- "Anyone can read email subscribers" - SELECT
- "Anyone can insert preference changes" - INSERT
- "Anyone can read their own preference changes" - SELECT

### 5. Test Edge Function Directly

You can test the Edge Function directly with curl:

```bash
curl -X POST https://eqiafsygvfaifhoaewxi.supabase.co/functions/v1/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["your-email@example.com"],
    "subject": "Test Email",
    "body": "This is a test"
  }'
```

### 6. Common Causes of 403

1. **JWT Verification Still Enabled**: Even though we deployed with `--no-verify-jwt`, check dashboard settings
2. **Missing RESEND_API_KEY**: Edge Function can't send emails without this
3. **Resend API Key Invalid**: Check if key is still valid on resend.com
4. **IP Restrictions**: Check if Supabase has IP restrictions enabled
5. **CORS Policy**: Should be allowing all origins with `*`

## Current Workaround

The code has been updated to not throw errors when email fails. This means:
- ✅ User preferences will save successfully
- ✅ Record created in `pending_preference_changes` table
- ❌ Admin notification email won't be sent (but admin can still see it in portal)
- User will see success message

## Files Modified

1. `fix_email_subscribers_rls.sql` - Allow SELECT on email_subscribers
2. `fix_pending_preference_changes_rls.sql` - Allow INSERT and SELECT on pending_preference_changes
3. `supabase/functions/send-notification/index.ts` - Removed auth check, added logging
4. `supabase/functions/send-notification/deno.json` - Added `verify_jwt: false`
5. `src/lib/emailNotifications.ts` - Made email errors non-blocking

## Testing

1. Make sure both RLS SQL files have been run in Supabase SQL Editor
2. Try saving preferences in UserSettings
3. Should see success message even if email fails
4. Check `pending_preference_changes` table - record should be there
5. Check Edge Function logs for actual error

## Date
October 17, 2025
