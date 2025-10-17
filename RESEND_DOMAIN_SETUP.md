# Resend Domain Verification Guide

## Current Issue - RESOLVED ✅

**Problem:** Getting 403 error from Resend: "You can only send testing emails to your own email address"

**Root Cause:** Using `onboarding@resend.dev` (test email) which can ONLY send to the email associated with your Resend account (markdlarson@me.com)

**Temporary Fix Applied:** Modified Edge Function to filter recipients and only send to markdlarson@me.com when using test email

## Current State

- ✅ Emails will now send successfully
- ✅ Will only go to markdlarson@me.com (your email)
- ⚠️ Subject line includes "[TEST MODE - Limited Recipients]"
- ⚠️ Won't send to other admin emails until domain is verified

## Production Setup - Verify a Domain

To send emails to multiple admins, you need to verify a domain:

### Step 1: Add Domain in Resend

1. Go to: https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain (e.g., `yourchurch.com` or `prayers.yourchurch.com`)
4. Click "Add"

### Step 2: Add DNS Records

Resend will provide DNS records to add:

1. **SPF Record** (TXT)
2. **DKIM Record** (TXT)  
3. **DMARC Record** (TXT)

Add these to your domain's DNS settings (wherever your domain is hosted):
- GoDaddy
- Namecheap
- Cloudflare
- Google Domains
- etc.

### Step 3: Wait for Verification

- Usually takes 15 minutes to 24 hours
- Resend will automatically check
- You'll get an email when verified

### Step 4: Update Edge Function

Once domain is verified, update the `from` address:

```typescript
// In: supabase/functions/send-notification/index.ts
// Change line ~69 from:
from: 'Prayer Requests <onboarding@resend.dev>'

// To:
from: 'Prayer Requests <noreply@yourchurch.com>'
```

Then redeploy:
```bash
supabase functions deploy send-notification --no-verify-jwt
```

### Step 5: Remove Test Mode Filtering

Once using verified domain, remove the recipient filtering:

```typescript
// Remove lines that filter recipients
// Change back to:
to: Array.isArray(to) ? to : [to],
// And remove the [TEST MODE] from subject
```

## Alternative: Use Your Email for Testing

If you don't have a domain to verify, you can keep the current setup where:
- All admin notifications go to markdlarson@me.com
- Works fine for single-person testing
- Just remember emails are filtered to your address only

## Files Modified

- `supabase/functions/send-notification/index.ts` - Added recipient filtering for test mode

## Current Behavior

When saving email preferences:
1. ✅ Preference saves to `pending_preference_changes`
2. ✅ Email sent to markdlarson@me.com
3. ✅ Subject includes "[TEST MODE]" indicator
4. ⚠️ Other admin emails filtered out (not sent)

## Next Steps

**Option A - Production (Recommended):**
1. Verify a domain at resend.com/domains
2. Update `from` address to use verified domain
3. Remove test mode filtering
4. Redeploy

**Option B - Keep Testing:**
- Current setup works for single admin (you)
- All notifications go to your email
- No action needed

## Date
October 17, 2025
