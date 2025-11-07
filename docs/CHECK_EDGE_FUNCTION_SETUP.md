# 🔧 Edge Function Setup Checklist

## Problem
The `send-verification-code` Edge Function is deployed but returning a 500 error. This means it's missing required environment variables.

## ✅ Quick Fix Steps

### 1. Open Supabase Dashboard
Go to: https://supabase.com/dashboard/project/eqiafsygvfaifhoaewxi/settings/functions

### 2. Check Edge Function Secrets

Click on "Edge Function Secrets" and verify these 4 secrets exist:

#### ✅ RESEND_API_KEY
```
Value: re_xxxxxxxxxxxxxxxxxx
```
- Get from: https://resend.com/api-keys
- Create one if you don't have it

#### ✅ RESEND_FROM_EMAIL
```
Value: noreply@yourdomain.com
```
- Must be a verified domain in Resend
- Get from: https://resend.com/domains
- Can also use format: `Prayer App <noreply@yourdomain.com>`

#### ✅ SUPABASE_URL
```
Value: https://eqiafsygvfaifhoaewxi.supabase.co
```

#### ✅ SUPABASE_SERVICE_ROLE_KEY
```
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS... (very long)
```
- Get from: Project Settings → API → service_role key (click to reveal)

### 3. Add Missing Secrets

For each missing secret:
1. Click "+ New secret"
2. Enter the name exactly as shown above (case-sensitive!)
3. Paste the value
4. Click "Save"

### 4. Redeploy the Function (After Adding Secrets)

After adding all secrets, redeploy to pick up the new environment variables:

```bash
./deploy-functions.sh send-verification-code
```

### 5. Test Again

1. Go to User Settings in your app
2. Enter an email and name
3. Click Save Preferences
4. Should now send verification code!

## 🔍 Still Getting Errors?

### Check Edge Function Logs

1. Go to: https://supabase.com/dashboard/project/eqiafsygvfaifhoaewxi/functions/send-verification-code/logs
2. Click on the most recent failed invocation
3. Look at the error message - it will tell you which variable is missing

### Common Error Messages:

#### "Missing required environment variables"
- One or more of the 4 secrets is not set
- Double-check the names are exact (case-sensitive)

#### "Email service error: 401"
- `RESEND_API_KEY` is invalid or expired
- Go to Resend and create a new API key

#### "Email service error: 403"
- `RESEND_FROM_EMAIL` domain is not verified
- Go to Resend Domains and verify your domain

#### "Database error: Invalid JWT"
- `SUPABASE_SERVICE_ROLE_KEY` is wrong
- Copy it again from Project Settings → API

## 📋 Copy-Paste Values

### SUPABASE_URL
```
https://eqiafsygvfaifhoaewxi.supabase.co
```

### Get SUPABASE_SERVICE_ROLE_KEY
1. Go to: https://supabase.com/dashboard/project/eqiafsygvfaifhoaewxi/settings/api
2. Scroll to "Project API keys"
3. Find "service_role" (secret)
4. Click to reveal and copy

### Get RESEND_API_KEY
1. Go to: https://resend.com/api-keys
2. Click "Create API Key"
3. Name it "Prayer App Production"
4. Select "Sending access"
5. Copy the key (starts with `re_`)

### Get RESEND_FROM_EMAIL
1. Go to: https://resend.com/domains
2. Add your domain if not already added
3. Verify it by adding the DNS records
4. Use format: `noreply@yourdomain.com` or `Prayer App <noreply@yourdomain.com>`

## 🚀 After Setup

Once all 4 secrets are set:

1. Redeploy: `./deploy-functions.sh send-verification-code`
2. Wait 30 seconds for changes to propagate
3. Try the verification flow again
4. Should work! ✅

## 💡 Alternative: Disable Verification Temporarily

If you want to test the subscription flow without verification while you set up the secrets:

```sql
-- Run in Supabase SQL Editor
UPDATE admin_settings 
SET require_email_verification = false 
WHERE id = 1;
```

This lets you test the subscription signup flow immediately. You can re-enable verification after setting up the secrets:

```sql
UPDATE admin_settings 
SET require_email_verification = true 
WHERE id = 1;
```
