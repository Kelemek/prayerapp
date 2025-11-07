# Email System Guide

Complete guide for the Prayer App email notification system using Microsoft Graph API.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup](#setup)
- [Email Features](#email-features)
- [Email Subscriber System](#email-subscriber-system)
- [Prayer Reminders](#prayer-reminders)
- [Email Templates](#email-templates)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Prayer App sends automated emails for:

- 📧 **Prayer Approvals/Denials**: Notify requesters when prayers are reviewed
- 🔔 **New Prayer Notifications**: Alert subscribers to approved prayers
- ⏰ **Prayer Reminders**: Encourage updates on inactive prayers
- ✅ **Status Changes**: Notify when prayer status updates
- 📝 **Preference Changes**: Confirm email subscription changes
- 🔐 **Admin Access**: Send admin invitation emails
- 📊 **Update Notifications**: Alert when updates are approved/denied

**Email Service**: Microsoft 365 SMTP (Graph API compatible)
**Rate Limit**: 30 emails per minute (automatically batched)
**Daily Limit**: 10,000 recipients/day (Microsoft 365 Nonprofit)

---

## Architecture

### Components

1. **Edge Functions**:
   - `send-notification`: Main email sender (Graph API compatible)
   - `send-prayer-reminders`: Automated reminder system
   - All use Microsoft 365 SMTP

2. **Database Tables**:
   - `email_subscribers`: Manages recipient list
   - `pending_preference_changes`: Tracks opt-in/opt-out requests
   - `admin_settings`: Controls email behavior

3. **Email Flow**:
   ```
   User Action → Edge Function → Microsoft Graph API → SMTP → Email Delivered
                 ↓
            Database Log (subscribers/preferences/analytics)
   ```

---

## Setup

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for complete setup instructions.

### Quick Setup Summary

#### 1. Create Microsoft 365 App Password

1. Go to https://portal.office.com
2. Sign in with your church's Microsoft 365 account
3. Navigate to: Profile → My Account → Security → App passwords
4. Create new app password named "Prayer App"
5. **Copy the password** (you won't see it again)

#### 2. Configure Supabase Secrets

```bash
npx supabase link --project-ref your-project-ref

# Set SMTP credentials
npx supabase secrets set SMTP_HOST=smtp.office365.com
npx supabase secrets set SMTP_PORT=587
npx supabase secrets set SMTP_USER=service@yourchurch.org
npx supabase secrets set SMTP_PASS=your-app-password
npx supabase secrets set SMTP_FROM=prayer@yourchurch.org
```

**Important**:
- `SMTP_USER`: Licensed service account that can authenticate
- `SMTP_FROM`: Shared mailbox address (what recipients see)
- Grant "Send As" permission to service account

#### 3. Deploy Edge Functions

```bash
./deploy-functions.sh
# Or individually:
supabase functions deploy send-notification --no-verify-jwt
supabase functions deploy send-prayer-reminders
```

#### 4. Test Email

1. Open Admin Portal
2. Send a test admin invite
3. Check Supabase Functions logs for errors

---

## Email Features

### 1. Prayer Approval Notifications

**When**: Prayer is approved or denied by admin
**Recipients**: Prayer requester (if email provided)
**Content**:
- Approval: Confirmation with prayer details
- Denial: Reason and encouragement to resubmit

### 2. New Prayer Notifications

**When**: Prayer is approved and becomes public
**Recipients**: Based on admin settings:
- `admin_only`: Only admin subscribers
- `all_users`: All active subscribers ✅

**Content**:
- Prayer title and description
- Requester name (or "Anonymous")
- Prayer category/type
- Link to view in app

**Configure**:
1. Admin Portal → Settings → Email Settings
2. Change "Email Distribution" dropdown
3. Select "All Users" to notify everyone

### 3. Update Notifications

**When**: Prayer update is approved or denied
**Recipients**: Update author (if email provided)
**Content**:
- Approval: Confirmation that update is public
- Denial: Reason provided by admin

### 4. Status Change Notifications

**When**: Prayer status change is approved/denied
**Recipients**: Requester who submitted status change
**Content**:
- New status (Current/Ongoing/Answered/Closed)
- Admin decision and reason (if denied)

### 5. Preference Change Notifications

**When**: Email subscription preference approved/denied
**Recipients**: User who requested preference change
**Content**:
- Approval: Welcome message, unsubscribe info
- Denial: Reason and contact information

### 6. Admin Access Emails

**When**: Admin adds new admin to system
**Recipients**: New admin user
**Content**:
- Welcome message
- Admin portal access instructions
- Password information
- Getting started guide

---

## Email Subscriber System

### How It Works

The Prayer App has a built-in subscriber system for managing who receives prayer notifications.

#### Database Table: `email_subscribers`

```sql
email_subscribers
  - id: UUID
  - name: TEXT
  - email: TEXT (unique)
  - is_active: BOOLEAN (true = subscribed, false = unsubscribed)
  - is_admin: BOOLEAN (receives admin notifications)
  - created_at: TIMESTAMP
```

#### Subscription Flow

1. **User opts in**:
   - Settings → Enter name and email
   - Check "Receive email notifications"
   - Click "Save Preferences"

2. **Admin approval**:
   - Admin Portal → Preferences tab
   - Review pending subscription request
   - Approve or deny

3. **Confirmation**:
   - User receives confirmation email
   - Added to active subscriber list

4. **User opts out**:
   - Settings → Uncheck "Receive email notifications"
   - Admin approves (typically auto-approved)
   - User removed from active list

### Managing Subscribers (Admin)

#### Add Subscribers Manually

1. Admin Portal → Email Settings tab
2. Click "+ Add Subscriber"
3. Enter:
   - Name (required)
   - Email (required)
   - Active status
   - Admin flag
4. Save (no approval needed)

#### Search & Filter

- Search by email or name
- View subscription status
- Toggle active/inactive
- Mark as admin for admin-only notifications

#### Admin vs Regular Subscribers

**Admin Subscribers**:
- Receive new prayer notifications
- Receive approval request notifications
- Get admin access emails
- System notifications

**Regular Subscribers**:
- Receive new prayer notifications only
- General prayer updates
- No admin-specific emails

---

## Prayer Reminders

Automated system to encourage prayer requesters to provide updates.

### How Reminders Work

#### Criteria for Sending

Reminders are sent to prayers meeting ALL of these:
- Status: "current" or "ongoing"
- Approval status: "approved"
- Has valid requester email
- **No activity** in X days (configurable interval)

#### Activity Tracking

System checks for:
- Prayer updates (uses most recent update date)
- If no updates, uses prayer creation date
- Only sends reminder if last activity > interval days

#### Configuration

1. **Admin Portal → Settings → Prayer Reminders**
2. Configure:
   - **Reminder Interval**: Days of inactivity before sending (default: 7)
   - **Range**: 1-90 days
   - **Disable**: Set to 0
3. Manual trigger: "Send Reminders Now" button

### Reminder Email Content

**Subject**: "Prayer Update Request - [Prayer Title]"

**Content**:
- Personalized greeting (requester name or "Friend")
- Prayer title and details
- Encouragement to provide update
- Options to share:
  - Answered prayers
  - Ongoing needs
  - Status changes
- Direct link to app
- Submission date reference

### Scheduling Reminders

#### Option 1: Supabase Cron (Recommended)

```sql
-- Run daily at 9 AM
SELECT cron.schedule(
  'send-prayer-reminders',
  '0 9 * * *',
  $$ SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/send-prayer-reminders',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) $$
);
```

#### Option 2: External Cron Service

Use services like:
- **Cron-job.org**: Free, reliable
- **EasyCron**: Feature-rich
- **GitHub Actions**: If using GitHub

Configure to call:
```
POST https://your-project.supabase.co/functions/v1/send-prayer-reminders
Headers: Authorization: Bearer YOUR_ANON_KEY
```

### Reminder Response

```json
{
  "message": "Successfully sent 5 reminder emails",
  "sent": 5,
  "total": 5,
  "errors": []
}
```

---

## Email Templates

All emails use HTML templates with inline CSS for compatibility.

### Template Components

1. **Header**: App branding, logo area
2. **Body**: Main content with prayer details
3. **Footer**: Unsubscribe, contact info, links
4. **Styling**: Inline CSS for email client compatibility

### Template Types

#### Approval/Denial Template
```html
<h2>Your Prayer Request: [Title]</h2>
<p>[Status: Approved or Denied]</p>
<p>[Reason or confirmation]</p>
<a href="[app-url]">View Prayer</a>
```

#### New Prayer Notification
```html
<h2>New Prayer Request</h2>
<p><strong>[Title]</strong></p>
<p>Requested by: [Name]</p>
<p>[Description]</p>
<a href="[app-url]">Pray Now</a>
```

#### Reminder Email
```html
<h2>Prayer Update Request</h2>
<p>Hi [Name],</p>
<p>Your prayer "[Title]" hasn't had updates recently.</p>
<p>Would you like to share how God is working?</p>
<a href="[app-url]">Add Update</a>
```

### Customizing Templates

Templates are defined in:
- `src/lib/emailService.ts` - Email service functions
- `src/components/AdminUserManagement.tsx` - Admin invite emails
- `supabase/functions/send-notification/index.ts` - Edge function templates

**To customize**:
1. Edit template HTML in relevant file
2. Test with manual trigger
3. Commit changes
4. Deploy edge functions (if modified)

---

## Bulk Sending & Rate Limits

### Microsoft 365 Limits

- **30 emails per minute** (SMTP rate limit)
- **10,000 recipients per day** (M365 Nonprofit)
- **500 recipients per message** (recommended max)

### Automatic Batching

The app automatically handles batching:

```typescript
// Sends 150 emails in 5 batches of 30
// With 60-second delay between batches
// Total time: ~5 minutes
```

**Progress**:
- Logs show batch progress
- Errors tracked per batch
- Continues even if some fail

### Best Practices

✅ **Do**:
- Send during off-peak hours
- Monitor Supabase function logs
- Test with small groups first
- Keep subscriber list clean

❌ **Don't**:
- Send to inactive emails
- Exceed daily limits
- Send duplicate emails
- Use purchased email lists

---

## Troubleshooting

### "Email service not configured" Error

**Cause**: Missing SMTP environment variables
**Fix**:
```bash
# Check secrets are set
npx supabase secrets list

# Re-set if missing
npx supabase secrets set SMTP_USER=your-user
npx supabase secrets set SMTP_PASS=your-password
```

### Emails Not Arriving

**Check**:
1. ✅ Spam/junk folders
2. ✅ Recipient email addresses are valid
3. ✅ Microsoft 365 admin center for blocks
4. ✅ "Send As" permission granted
5. ✅ Supabase function logs for errors

**Common causes**:
- Incorrect "Send As" permissions
- App password expired
- Service account locked
- SMTP blocked in tenant

### "Authentication failed" Error

**Cause**: Invalid app password or MFA issue
**Fix**:
1. Regenerate app password in Microsoft 365
2. Update Supabase secret:
   ```bash
   npx supabase secrets set SMTP_PASS=new-password
   ```
3. Redeploy edge function

### Emails Going to Spam

**Improve deliverability**:
1. ✅ Use verified Microsoft 365 domain
2. ✅ Configure SPF, DKIM, DMARC records
3. ✅ Use consistent "From" address
4. ✅ Avoid spam trigger words
5. ✅ Include unsubscribe link
6. ✅ Keep subscriber list clean

### Rate Limit Errors

**Symptoms**: "Too many requests" errors in logs
**Fix**:
- App automatically batches at 30/minute
- If still hitting limits, increase delay between batches
- Consider spreading sends over longer period

### Test Email Functionality

```bash
# View function logs in real-time
npx supabase functions logs send-notification --follow

# Check recent invocations
npx supabase functions list
```

---

## Security & Privacy

### Data Protection

- ✅ Email addresses encrypted in database
- ✅ Unsubscribe links in all bulk emails
- ✅ User consent required for subscriptions
- ✅ Admin approval for preference changes
- ✅ Row Level Security (RLS) on all tables

### GDPR Compliance

- ✅ Clear opt-in process
- ✅ Easy opt-out mechanism
- ✅ Data export available
- ✅ Right to deletion honored
- ✅ Privacy policy link in emails

### Best Practices

1. **Only email confirmed addresses**
2. **Honor unsubscribe immediately**
3. **Keep emails relevant**
4. **Don't share email lists**
5. **Secure API credentials**
6. **Monitor for abuse**
7. **Regular list cleanup**

---

## Advanced Configuration

### Custom Reply-To Address

Set different reply-to from sender:

```bash
npx supabase secrets set SMTP_REPLY_TO=replies@yourchurch.org
```

Update edge function to use:
```typescript
replyTo: Deno.env.get('SMTP_REPLY_TO') || SMTP_FROM
```

### Email Analytics

Track email engagement:
- Open rates (requires tracking pixel)
- Click rates (requires tracked links)
- Bounce rates (check M365 admin center)
- Unsubscribe rates (track in database)

### Custom Email Domains

Use subdomain for prayer app:
- `prayers.yourchurch.org`
- Better organization
- Separate reputation
- Custom branding

### Email Verification (2FA) Configuration

Configure verification code settings for enhanced security when enabled.

#### Verification Code Length

**Location:** Admin Portal → Settings → Email Settings → "Verification Code Length"

**Options:**
- 4 digits (10,000 combinations)
- **6 digits (1,000,000 combinations)** ⭐ Recommended
- 8 digits (100,000,000 combinations)

**Security Analysis:**

| Length | Combinations | Brute Force Time* |
|--------|--------------|-------------------|
| 4 digits | 10,000 | ~2.8 hours |
| **6 digits** | **1,000,000** | **~11.6 days** ⭐ |
| 8 digits | 100,000,000 | ~3.2 years |

*Assuming 1 attempt per second with no rate limiting

**Recommendation:** 6 digits provides excellent security while being easy for users to type. This is the industry standard (used by Google, Microsoft, etc.).

#### Code Expiration Time

**Location:** Admin Portal → Settings → Email Settings → "Code Expiration Time"

**Options:**
- 5 minutes
- 10 minutes
- **15 minutes** ⭐ Recommended
- 20 minutes
- 30 minutes
- 45 minutes
- 60 minutes

**Trade-offs:**

| Duration | User Experience | Security |
|----------|----------------|----------|
| 5 min | Rushed, may need resends | Excellent |
| 10 min | Tight but reasonable | Very good |
| **15 min** | **Comfortable for most** | **Good** ⭐ |
| 20-30 min | Relaxed | Fair |
| 45-60 min | Very relaxed | Lower |

**Recommendation:** 15 minutes is the sweet spot - enough time for users to check email and enter code, but short enough to maintain security.

#### Combined Security Analysis

Total security depends on **both** settings:

| Configuration | Risk Level |
|--------------|------------|
| 4 digits, 60 min | ⚠️ High risk |
| 4 digits, 15 min | ⚠️ Moderate risk |
| 6 digits, 60 min | ✓ Low risk |
| **6 digits, 15 min** | **✓✓ Very low risk** ⭐ |
| 8 digits, 5 min | ✓✓✓ Minimal risk |

**Additional Security Layers:**
- Single-use codes (can't be reused)
- Stored in database for audit trail
- Email delivery adds verification step

#### Configuration Recommendations by Use Case

**Standard Security (Recommended):**
- 6 digits, 15 minutes
- Best balance of security and usability

**High Security:**
- 8 digits, 10 minutes
- For sensitive organizations

**User-Friendly:**
- 6 digits, 20 minutes
- For less tech-savvy users

**Not Recommended:**
- 4 digits with any expiry time
- Any setting with 60-minute expiry (too long)

---

## Related Documentation

- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Initial email setup
- [FEATURES.md](FEATURES.md) - Email notification features
- [ADMIN_GUIDE.md](ADMIN_GUIDE.md) - Managing email settings
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common email issues
