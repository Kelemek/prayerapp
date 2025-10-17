# Quick Start: Email Notifications with Resend

## Your Resend API Key Goes Here:

### Method 1: Automated Setup (Recommended)
```bash
./setup-resend.sh
```
This script will:
- Prompt for your Resend API key
- Set it as a Supabase secret
- Deploy the Edge Function
- Apply database migrations

### Method 2: Manual Setup

#### Step 1: Set Supabase Secret
```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

#### Step 2: Deploy Edge Function
```bash
supabase functions deploy send-notification
```

#### Step 3: Apply Database Migration
```bash
supabase db push
```

#### Step 4: Configure Emails in App
1. Login to Admin Portal
2. Go to Settings tab
3. Add admin email addresses
4. Click Save

## Testing

Submit a new prayer request and check your email!

## Full Documentation

See **RESEND_SETUP.md** for complete instructions and troubleshooting.

## Important Notes

⚠️ **Domain Verification**: 
- Default sends from `onboarding@resend.dev`
- For custom domain (e.g., `notifications@cp-church.org`):
  1. Add domain in Resend dashboard
  2. Configure DNS records
  3. Update Edge Function code
  4. Redeploy

## Common Issues

**"Email service not configured"**
→ Set the secret: `supabase secrets set RESEND_API_KEY=your_key`

**"Failed to send email"**
→ Check logs: `supabase functions logs send-notification`

**Emails not received**
→ Check spam folder, verify domain in Resend

## Resend Limits
- Free: 100 emails/day, 3,000/month
- No credit card required
- Upgrade anytime at resend.com/pricing
