# Email Notification Troubleshooting

## Quick Checklist

✅ **Edge Function deployed** - `send-notification` is active (version 1)
✅ **Resend API key configured** - Secret is set in Supabase
❓ **Admin emails configured** - Need to verify
❓ **Email actually sending** - Need to check logs

## Steps to Debug

### 1. Check if Admin Emails are Configured

1. Open your app and log in as admin
2. Go to Admin Portal → Settings tab
3. Add at least one email address (your email)
4. Click "Save Settings"

### 2. Test the Email System

Try submitting a prayer request or deletion request and check:

**In Browser Console (F12):**
- Look for `Email notification sent successfully to: [...]`
- Look for any errors like `No admin emails configured`
- Look for errors like `Error sending notification:`

### 3. Check Supabase Edge Function Logs

Run this command to see real-time logs:

```bash
supabase functions logs send-notification
```

Or in the Supabase Dashboard:
1. Go to Edge Functions
2. Click on "send-notification"
3. View logs

### 4. Common Issues

#### Issue: "No admin emails configured"
**Solution:** Go to Admin Portal → Settings and add your email

#### Issue: Edge Function error "Invalid API key"
**Solution:** Check your Resend API key is correct:
```bash
# Set the correct API key
supabase secrets set RESEND_API_KEY=re_your_actual_key_here
```

#### Issue: Email sends but not received
**Possible causes:**
- Check spam/junk folder
- Resend free tier only sends to verified email addresses
- Need to verify your email in Resend dashboard

#### Issue: "from address must be verified"
**Solution:** 
1. Go to https://resend.com/domains
2. Add and verify your domain, OR
3. For testing, use the default `onboarding@resend.dev` (already configured)
4. Add your test email to Resend's audience

### 5. Verify Resend Configuration

1. Go to https://resend.com/emails
2. Check if emails are being sent
3. Check if emails are bouncing or being rejected

### 6. Test Edge Function Directly

You can test the Edge Function directly:

```bash
curl -X POST \
  'https://eqiafsygvfaifhoaewxi.supabase.co/functions/v1/send-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": ["your-email@example.com"],
    "subject": "Test Email",
    "body": "This is a test",
    "html": "<h1>This is a test</h1>"
  }'
```

Replace:
- `YOUR_ANON_KEY` with your Supabase anon key
- `your-email@example.com` with your email

## Next Steps

1. **First**: Check Admin Portal → Settings and add your email
2. **Then**: Submit a test prayer/deletion request
3. **Watch**: Browser console (F12) for any error messages
4. **Check**: `supabase functions logs send-notification` for Edge Function logs
5. **Verify**: Resend dashboard to see if emails are being sent
