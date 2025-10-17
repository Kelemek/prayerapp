# Email System Guide

Complete guide for the Prayer App email notification system using Resend.

## Overview

The Prayer App sends emails for:
- 📧 Prayer request approvals/denials
- 🔔 New prayer notifications to subscribers
- ⏰ Prayer reminder emails (for inactive prayers)
- ✅ Status change notifications
- 📝 Email subscription preference changes

## Architecture

### Components

1. **Edge Function**: `send-notification` - Handles all email sending via Resend API
2. **Email Subscribers**: Manages who receives emails
3. **Preference System**: User opt-in/opt-out with admin approval
4. **Automated Reminders**: Scheduled reminder emails

### Email Flow

```
User Action → Edge Function → Resend API → Email Delivered
              ↓
         Database Log (subscribers/preferences)
```

## Setup

### 1. Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys section
3. Create new API key
4. Copy the key (starts with `re_`)

### 2. Add to Supabase

In Supabase Dashboard:
1. Go to Edge Functions → Send Notification → Settings
2. Add secret: `RESEND_API_KEY`
3. Paste your Resend API key

### 3. Deploy Edge Function

```bash
# Deploy with no JWT verification (allows anonymous sending)
supabase functions deploy send-notification --no-verify-jwt

# Or use the deploy script
./deploy-functions.sh send-notification
```

### 4. Test Mode vs Production

#### Test Mode (Current Setup)

Using `onboarding@resend.dev`:
- ✅ Free, no domain verification needed
- ⚠️ Can **only** send to email associated with your Resend account
- ⚠️ Subject includes "[TEST MODE - Limited Recipients]"
- 📧 All emails filtered to your email only

Good for: Development and testing

#### Production Mode (Recommended)

Using verified domain:
- ✅ Send to any email address
- ✅ Professional sender address (`noreply@yourchurch.com`)
- ✅ Better deliverability
- ✅ No "[TEST MODE]" in subject

See **Domain Verification** section below.

## Domain Verification (Production)

### Why Verify a Domain?

- Send emails to multiple recipients
- Professional "from" address
- Better email deliverability
- Remove test mode restrictions

### Steps

1. **Add Domain in Resend**
   - Go to [resend.com/domains](https://resend.com/domains)
   - Click "Add Domain"
   - Enter your domain (e.g., `yourchurch.com` or `prayers.yourchurch.com`)

2. **Add DNS Records**

Resend will provide 3 DNS records:

| Type | Name | Value |
|------|------|-------|
| TXT | @ or domain | SPF record |
| TXT | resend._domainkey | DKIM record |
| TXT | _dmarc | DMARC record |

Add these to your domain's DNS settings (GoDaddy, Namecheap, Cloudflare, etc.)

3. **Wait for Verification**
   - Usually takes 15 minutes to 24 hours
   - Resend automatically checks
   - You'll get email when verified

4. **Update Edge Function**

In `supabase/functions/send-notification/index.ts`, change line ~69:

```typescript
// FROM:
from: 'Prayer Requests <onboarding@resend.dev>'

// TO:
from: 'Prayer Requests <noreply@yourchurch.com>'
```

5. **Remove Test Mode Filtering**

In same file, remove the recipient filtering code (lines ~60-75):

```typescript
// Remove this entire section:
const recipientList = Array.isArray(to) ? to : [to];
const allowedTestEmail = 'markdlarson@me.com';
// ... filtering code ...
```

Replace with:
```typescript
const recipientList = Array.isArray(to) ? to : [to];
```

6. **Redeploy**

```bash
./deploy-functions.sh send-notification
```

## Email Subscribers

### Add Admin Subscribers

In Admin Portal → Email Settings:
1. Click "Add Subscriber"
2. Enter email and name
3. Check "Is Admin" for admin emails
4. Check "Is Active" to enable

### User Self-Service

Users can manage their own preferences:
1. Click Settings icon (top right)
2. Enter name and email
3. Check/uncheck "Receive email notifications"
4. Click "Save Preferences"
5. Admin approves in Admin Portal → Preferences tab

### Database Tables

#### `email_subscribers`
Main subscriber list (approved users):
- `email` - Email address
- `name` - Subscriber name
- `is_admin` - Receives admin notifications
- `is_active` - Currently subscribed

#### `pending_preference_changes`
User-submitted preference changes awaiting approval:
- `email` - User email
- `name` - User name
- `receive_new_prayer_notifications` - Requested state
- `approval_status` - pending/approved/denied

## Email Types

### 1. Prayer Approval Notifications

**Sent to**: Prayer requester
**When**: Admin approves prayer request
**Template**: Includes prayer title, link to view

### 2. New Prayer Notifications

**Sent to**: All active subscribers (non-admin)
**When**: Prayer is approved
**Triggered by**: Admin approval action
**Contains**: Prayer title, description, link

### 3. Prayer Reminders

**Sent to**: Prayer requester
**When**: Prayer has no updates for X days (configurable)
**Configured in**: Admin Portal → Admin Settings
**Trigger**: "Send Reminders Now" button or scheduled Edge Function

**Setup**:
```bash
# Deploy reminder function
./deploy-functions.sh send-prayer-reminders
```

Configure days threshold in Admin Settings.

### 4. Status Change Notifications

**Sent to**: Prayer requester
**When**: Status changes (current → answered, etc.)
**Contains**: Old status, new status, reason

### 5. Preference Change Notifications

**Sent to**: Admins
**When**: User submits preference change
**Contains**: User name, email, requested preference

## Troubleshooting

### Emails Not Sending

1. **Check Edge Function Logs**
   - Supabase Dashboard → Edge Functions → send-notification → Logs
   - Look for errors

2. **Verify API Key**
   ```bash
   # In Supabase Dashboard
   Edge Functions → Settings → Secrets
   # Check RESEND_API_KEY is set
   ```

3. **Check Resend Dashboard**
   - Go to [resend.com/emails](https://resend.com/emails)
   - See delivery status and errors

### Common Errors

**403 Forbidden from Resend**
- Problem: Using test email but sending to other addresses
- Solution: Verify domain or only send to your email

**Edge Function 403**
- Problem: JWT verification enabled
- Solution: Deploy with `--no-verify-jwt` flag

**No emails received**
- Check spam folder
- Verify email address in subscribers list
- Check `is_active` is true

### Test Email Sending

You can test directly in Supabase SQL Editor:

```sql
-- Test query (requires RLS policies)
SELECT * FROM email_subscribers WHERE is_active = true;

-- Add test subscriber
INSERT INTO email_subscribers (email, name, is_admin, is_active)
VALUES ('test@example.com', 'Test User', false, true);
```

## Best Practices

### For Development

- ✅ Use test mode (onboarding@resend.dev)
- ✅ Filter to your email only
- ✅ Add "[TEST]" or "[DEV]" to subject lines

### For Production

- ✅ Verify your domain
- ✅ Use professional from address
- ✅ Monitor Resend dashboard for deliverability
- ✅ Keep subscriber list clean (remove bounces)
- ✅ Respect opt-outs immediately

### Email Content

- ✅ Keep subject lines clear and concise
- ✅ Include unsubscribe link (in Settings)
- ✅ Make emails mobile-friendly
- ✅ Include church/organization branding

## Configuration

### Admin Settings

In Admin Portal → Admin Settings:

| Setting | Description | Default |
|---------|-------------|---------|
| Notification Emails | Admin email addresses (comma-separated) | - |
| Reminder Days | Days before sending reminder | 7 |

### Email Templates

Templates are in `src/lib/emailNotifications.ts`:

- `generateEmailHTML()` - Main template wrapper
- `generatePrayerApprovalHTML()` - Prayer approved
- `generateNewPrayerNotificationHTML()` - New prayer for subscribers
- `generateReminderEmailHTML()` - Reminder template

## Rate Limits

### Resend Limits

**Free Plan**:
- 100 emails/day
- 3,000 emails/month

**Paid Plans**: See [resend.com/pricing](https://resend.com/pricing)

### Recommendations

- Monitor email volume
- Use batch sending for large subscriber lists
- Consider upgrade if exceeding limits

## Security

### RLS Policies

Required for email system:

```sql
-- Email subscribers (READ access)
CREATE POLICY "Anyone can read email subscribers"
ON email_subscribers FOR SELECT
TO anon, authenticated USING (true);

-- Preference changes (INSERT/SELECT)
CREATE POLICY "Anyone can insert preference changes"
ON pending_preference_changes FOR INSERT
TO anon, authenticated WITH CHECK (true);
```

These are in:
- `supabase/migrations/fix_email_subscribers_rls.sql`
- `supabase/migrations/fix_pending_preference_changes_rls.sql`

### API Key Protection

- ✅ Store in Supabase secrets (never in code)
- ✅ Don't commit `.env` files
- ✅ Rotate keys periodically
- ✅ Use separate keys for dev/prod

## Support

For Resend-specific issues:
- [Resend Docs](https://resend.com/docs)
- [Resend Support](https://resend.com/support)

For app issues:
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Review Edge Function logs
- Check database for subscriber records
