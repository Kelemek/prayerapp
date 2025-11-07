# Verify Edge Function Setup for Email Verification

## ✅ Deployed Functions
The `send-verification-code` Edge Function has been deployed successfully.

## 📋 Required Environment Variables

The Edge Function needs these secrets to be set in Supabase. Check if they're configured:

### 1. Go to Supabase Dashboard
- Open: https://supabase.com/dashboard/project/eqiafsygvfaifhoaewxi/settings/functions

### 2. Verify These Secrets Are Set:

#### RESEND_API_KEY
- **What**: Your Resend API key for sending emails
- **Get it**: https://resend.com/api-keys
- **Format**: `re_xxxxxxxxxxxxx`

#### RESEND_FROM_EMAIL  
- **What**: Your verified sender email address
- **Get it**: Must be verified in Resend (https://resend.com/domains)
- **Format**: `noreply@yourdomain.com` or `Prayer App <noreply@yourdomain.com>`

#### SUPABASE_URL
- **What**: Your Supabase project URL
- **Value**: `https://eqiafsygvfaifhoaewxi.supabase.co`

#### SUPABASE_SERVICE_ROLE_KEY
- **What**: Your Supabase service role key (has full database access)
- **Get it**: Project Settings → API → service_role key (secret)
- **Format**: Long string starting with `eyJ...`

## 🧪 Test the Setup

After setting the environment variables, test the email verification:

1. Go to your app's User Settings
2. Enter a NEW email address that's not in the system
3. Enter your name
4. Check "Receive notifications"
5. Click "Save Preferences"

### Expected Behavior:
1. ✅ Verification dialog appears
2. ✅ Email sent with 6-digit code
3. ✅ Enter code
4. ✅ Success message about admin approval
5. ✅ Admin gets notification email
6. ✅ Go to Admin Settings → Pending Changes
7. ✅ Approve the request
8. ✅ User is now in email_subscribers table

### If It Fails:
1. Open browser console (F12)
2. Look for detailed error messages (we added extra logging)
3. Check the error message - it should now show more details

## 🔍 Debugging

### Check Edge Function Logs:
1. Go to: https://supabase.com/dashboard/project/eqiafsygvfaifhoaewxi/functions/send-verification-code/logs
2. Click on recent invocations
3. Look for error messages

### Common Issues:

#### "Missing required environment variables"
- One or more secrets not set in Supabase
- Go to Functions settings and add them

#### "Email service error"
- RESEND_API_KEY is invalid or expired
- RESEND_FROM_EMAIL not verified in Resend
- Check Resend dashboard for issues

#### "Database error"
- SUPABASE_SERVICE_ROLE_KEY is invalid
- Database table missing (check migrations ran)

## 📝 How the Flow Works

1. **User enters email in Settings** → Clicks Save
2. **Frontend calls** `requestCode()` in useVerification hook
3. **Hook invokes** `send-verification-code` Edge Function
4. **Edge Function**:
   - Generates random 6-digit code
   - Stores in `verification_codes` table with expiry
   - Sends email via Resend API
   - Returns `codeId` and `expiresAt`
5. **Frontend shows** verification dialog
6. **User enters code** → Frontend calls `verifyCode()`
7. **Verify Code Edge Function** checks if code matches
8. **If valid**: Submits to `pending_preference_changes`
9. **Admin approves** → Creates/updates `email_subscribers`
10. **User is subscribed!** ✅

## 🚀 Next Steps

1. ✅ Edge Function deployed
2. ⏳ Set environment variables in Supabase
3. ⏳ Test email verification flow
4. ⏳ Verify admin approval workflow
5. ⏳ Confirm user gets subscribed

## 💡 Alternative: Quick Test Without Verification

If you just want to test the subscription signup without verification:

```sql
-- Temporarily disable verification
UPDATE admin_settings 
SET require_email_verification = false 
WHERE id = 1;
```

Test the flow, then re-enable:

```sql
-- Re-enable verification
UPDATE admin_settings 
SET require_email_verification = true 
WHERE id = 1;
```
