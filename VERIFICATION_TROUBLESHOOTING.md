# Email Verification Troubleshooting Guide

## Quick Diagnostic Steps

### 1. Check if Verification is Enabled

Open browser console on your production site and run:
```javascript
const { data } = await supabase
  .from('admin_settings')
  .select('email_verification_required')
  .eq('key', 'email_verification_required')
  .maybeSingle();

console.log('Verification enabled:', data?.value);
```

**Expected:** `true` if verification should be working

### 2. Check if Edge Functions are Deployed

Visit these URLs in your browser (replace YOUR_PROJECT with your project ref):
```
https://YOUR_PROJECT.supabase.co/functions/v1/send-verification-code
https://YOUR_PROJECT.supabase.co/functions/v1/verify-code
```

**Expected:** 
- NOT "404 Function Not Found" 
- Should get CORS or OPTIONS response

### 3. Test Edge Function Manually

In browser console:
```javascript
const { data, error } = await supabase.functions.invoke('send-verification-code', {
  body: {
    email: 'test@example.com',
    actionType: 'preference_change',
    actionData: { test: true }
  }
});

console.log('Function response:', { data, error });
```

**Expected:** 
- `data.success: true`
- `data.codeId: "some-uuid"`
- Email should be received

### 4. Check Environment Variables

Run in terminal:
```bash
supabase functions list
supabase secrets list
```

**Expected variables:**
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Common Issues & Fixes

### Issue 1: "Function Not Found" (404)
**Cause:** Edge functions not deployed
**Fix:**
```bash
cd /Users/marklarson/Documents/GitHub/prayerapp
supabase functions deploy send-verification-code
supabase functions deploy verify-code
```

### Issue 2: "Server configuration error"
**Cause:** Missing environment variables
**Fix:** Set secrets in Supabase Dashboard or via CLI:
```bash
supabase secrets set RESEND_API_KEY=re_your_key_here
supabase secrets set RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Issue 3: Email not sending
**Cause:** 
- Wrong RESEND_API_KEY
- RESEND_FROM_EMAIL domain not verified
- Resend account not activated

**Fix:**
1. Check Resend Dashboard → API Keys (key should start with `re_`)
2. Verify domain in Resend Dashboard → Domains
3. Check Resend logs for delivery issues

### Issue 4: Verification modal doesn't show
**Cause:** Verification disabled in admin settings
**Fix:** 
1. Go to Admin view in your app
2. Settings tab
3. Enable "Email Verification Required"

### Issue 5: Code always says "invalid"
**Cause:** Clock skew or verification_codes table issue
**Check:**
```sql
-- Check if codes are being created
SELECT * FROM verification_codes ORDER BY created_at DESC LIMIT 5;
```

### Issue 6: CORS errors in console
**Cause:** Edge function CORS headers
**Fix:** Already implemented in functions, but verify headers are:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## Step-by-Step Re-deployment

If nothing works, redeploy everything:

```bash
# 1. Ensure you're linked to correct project
supabase link --project-ref YOUR_PROJECT_REF

# 2. Apply database migrations
supabase db push

# 3. Deploy Edge Functions
supabase functions deploy send-verification-code
supabase functions deploy verify-code

# 4. Set all secrets
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set RESEND_FROM_EMAIL=noreply@yourdomain.com
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 5. Test function
curl -i --location --request POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/send-verification-code' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"email":"test@example.com","actionType":"preference_change","actionData":{}}'
```

## Check Function Logs

```bash
# Watch logs in real-time
supabase functions logs send-verification-code --follow
supabase functions logs verify-code --follow
```

Look for:
- ✅ Success messages
- ❌ Error messages
- 📧 Email sent confirmations

## Browser Console Debug Mode

Add this to your browser console while testing:
```javascript
// Enable detailed logging
localStorage.setItem('DEBUG', 'verification:*');

// Then try to submit a form that requires verification
// Check console for detailed logs from useVerification hook
```

## Contact Support If Needed

If verification still doesn't work:
1. Check Supabase Edge Function logs
2. Check Resend delivery logs
3. Check browser console for errors
4. Share specific error messages

## Quick Win: Disable Verification Temporarily

If you need the app working ASAP while debugging:
```sql
-- Temporarily disable verification
UPDATE admin_settings 
SET value = false 
WHERE key = 'email_verification_required';
```

This lets users submit forms immediately while you debug the verification system.
