# Resend Email Setup - Quick Start Guide

## Step 1: Get Your Resend API Key

You've already signed up! Now get your API key:
1. Go to https://resend.com/api-keys
2. Copy your API key (starts with `re_`)

## Step 2: Set Up Supabase Edge Function Secret

You need to add your Resend API key as a secret in Supabase:

### Option A: Using Supabase Dashboard (Easiest)
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/functions
2. Click on "Edge Functions" in the left sidebar
3. Click "Add new secret"
4. Name: `RESEND_API_KEY`
5. Value: Paste your Resend API key (starts with `re_`)
6. Click "Create secret"

### Option B: Using Supabase CLI
```bash
# Login to Supabase (if not already logged in)
supabase login

# Link your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Set the secret
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

## Step 3: Deploy the Edge Function

Deploy the send-notification function to Supabase:

```bash
# Make sure you're in your project directory
cd /Users/marklarson/Documents/GitHub/prayerapp

# Deploy the function
supabase functions deploy send-notification

# Verify it deployed successfully
supabase functions list
```

## Step 4: Run the Database Migration

Apply the admin_settings table migration:

```bash
# Push the migration to your Supabase database
supabase db push

# Or if you prefer, run the SQL directly in Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Copy/paste contents of: supabase/migrations/create_admin_settings.sql
# 3. Click "Run"
```

## Step 5: Configure Admin Emails

1. Go to your app: http://localhost:5180 (or your production URL)
2. Log in as admin
3. Click "Admin Portal"
4. Click "Settings" tab
5. Add admin email addresses
6. Click "Save Settings"

## Step 6: Verify Your Domain (Important!)

**⚠️ IMPORTANT**: By default, Resend only lets you send from `onboarding@resend.dev`. To use your own domain:

1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain (e.g., `cp-church.org`)
4. Add the DNS records Resend provides to your domain
5. Wait for verification (usually 5-15 minutes)
6. Update the Edge Function to use your verified domain:

```typescript
// In supabase/functions/send-notification/index.ts
// Change line 49:
from: 'Prayer Requests <notifications@cp-church.org>', // Your verified domain
```

7. Redeploy the function:
```bash
supabase functions deploy send-notification
```

## Step 7: Test It!

1. Submit a new prayer request from your app
2. Check the admin's email inbox
3. You should receive a notification email!

## Troubleshooting

### "Email service not configured" error
- Make sure you set the `RESEND_API_KEY` secret in Supabase
- Check the secret exists: Run `supabase secrets list`
- Redeploy the function after setting secrets

### Emails not being sent
- Check Supabase Edge Function logs:
  ```bash
  supabase functions logs send-notification
  ```
- Verify your Resend API key is valid at https://resend.com/api-keys
- Check Resend dashboard for error logs
- Make sure your domain is verified (or use `onboarding@resend.dev` for testing)

### "Failed to send email" error
- Check if you've hit Resend's free tier limit (100 emails/day)
- Verify the "from" email domain is verified in Resend
- Check Edge Function logs for detailed error messages

### Database errors
- Verify the admin_settings table exists:
  ```bash
  supabase db diff
  ```
- Check RLS policies are enabled
- Make sure you're logged in as an authenticated user

## Testing Email Locally (Optional)

If you want to test emails locally before deploying:

1. Install Supabase CLI if not already installed:
```bash
brew install supabase/tap/supabase
```

2. Set up local environment:
```bash
# Create .env file for local testing
echo "RESEND_API_KEY=re_your_api_key_here" > supabase/.env
```

3. Run function locally:
```bash
supabase functions serve send-notification --env-file supabase/.env
```

4. Test with curl:
```bash
curl -X POST http://localhost:54321/functions/v1/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["your-email@example.com"],
    "subject": "Test Email",
    "body": "This is a test email",
    "html": "<p>This is a <strong>test</strong> email</p>"
  }'
```

## Quick Reference

### Useful Commands
```bash
# Deploy function
supabase functions deploy send-notification

# View function logs
supabase functions logs send-notification

# List all secrets
supabase secrets list

# Update a secret
supabase secrets set RESEND_API_KEY=new_key_here

# Run migrations
supabase db push
```

### Important URLs
- Resend Dashboard: https://resend.com/overview
- Resend API Keys: https://resend.com/api-keys
- Resend Domains: https://resend.com/domains
- Supabase Dashboard: https://supabase.com/dashboard
- Edge Functions Logs: https://supabase.com/dashboard/project/YOUR_PROJECT/logs

## What Happens When a Prayer is Submitted?

1. User submits prayer request → Saved to database as "pending"
2. `sendAdminNotification()` is called automatically
3. Function gets admin email list from database
4. Supabase Edge Function is invoked
5. Edge Function calls Resend API
6. Resend sends HTML email to all admins
7. Admins receive notification with link to review

## Email Limits

**Resend Free Tier:**
- 100 emails per day
- 3,000 emails per month
- No credit card required

If you need more, upgrade to:
- **Pro**: $20/month for 50,000 emails
- **Enterprise**: Custom pricing

## Next Steps

After everything works:
1. ✅ Test prayer submission → email notification
2. ✅ Test update submission → email notification
3. ✅ Verify domain for professional "from" address
4. ✅ Add multiple admin emails
5. ✅ Monitor Resend dashboard for delivery stats
6. ✅ Consider upgrading if you need more than 100 emails/day

## Support

If you run into issues:
1. Check the logs: `supabase functions logs send-notification`
2. Verify secrets: `supabase secrets list`
3. Test Resend API directly: https://resend.com/docs/api-reference/emails/send-email
4. Check this guide: /EMAIL_NOTIFICATIONS.md
