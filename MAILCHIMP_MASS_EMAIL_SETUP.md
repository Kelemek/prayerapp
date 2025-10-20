# Mailchimp Mass Email Setup Guide

## Overview
This guide sets up Mailchimp to send mass emails to all subscribers when a prayer is approved, while keeping Resend free tier for admin transactional emails.

## Email Strategy

### Resend (Free Tier - Transactional)
- ✅ Admin approval/denial notifications
- ✅ Personal requester confirmation emails
- ✅ Stays within 100 emails/day, 3,000/month limit

### Mailchimp (Free Tier - Mass Distribution)
- ✅ Mass emails to ALL subscribers when prayer approved
- ✅ Newsletter-style formatting
- ✅ Up to 500 contacts, 1,000 emails/month free

## Setup Steps

### 1. Create Mailchimp Account
1. Go to [mailchimp.com](https://mailchimp.com)
2. Sign up for a **Free** account
3. Complete account setup and verify your email

### 2. Create Audience
1. In Mailchimp dashboard, go to **Audience** → **All contacts**
2. Click **Create Audience**
3. Fill in details:
   - **Audience name**: "Prayer App Subscribers"
   - **Default from email**: Your verified email
   - **Default from name**: "Prayer App" or your church name
4. Complete required fields and create audience

### 3. Get API Key
1. Click your profile icon → **Account & billing**
2. Go to **Extras** → **API keys**
3. Click **Create A Key**
4. Copy the API key (save it securely - shown only once!)

### 4. Get Server Prefix
Your server prefix is in your Mailchimp URL:
- If URL is `https://us12.admin.mailchimp.com/`, server prefix is `us12`
- If URL is `https://us21.admin.mailchimp.com/`, server prefix is `us21`

### 5. Get Audience ID
1. Go to **Audience** → **All contacts**
2. Click **Settings** → **Audience name and defaults**
3. Copy the **Audience ID** (looks like: `abc123def4`)

### 6. Set Environment Variables in Supabase
```bash
# Set Mailchimp credentials
supabase secrets set MAILCHIMP_API_KEY="your-api-key-here"
supabase secrets set MAILCHIMP_SERVER_PREFIX="us12"  # Your server prefix
supabase secrets set MAILCHIMP_AUDIENCE_ID="your-audience-id"
```

### 7. Deploy Edge Function
```bash
cd /Users/marklarson/Documents/GitHub/prayerapp

# Deploy the Mailchimp Edge Function
supabase functions deploy send-mass-prayer-email

# Verify deployment
supabase functions list
```

### 8. Sync Your Email Subscribers
You need to sync your existing `email_subscribers` to Mailchimp:

1. Go to your **Admin Portal**
2. Click on **Settings** tab
3. Scroll down to **"Sync Subscribers to Mailchimp"** section
4. Click **"Sync Subscribers Now"** button
5. Wait for the sync to complete (you'll see results showing successful/failed syncs)

**Note:** The `SyncMailchimpSubscribers` component has been added to your Admin Portal automatically.

### 9. Update Email Subscriber Management
When users opt in/out, sync with Mailchimp:

```typescript
// In your EmailSubscribers component or wherever you manage subscriptions
async function syncWithMailchimp(email: string, name: string, isActive: boolean) {
  if (isActive) {
    // Add to Mailchimp
    await supabase.functions.invoke('send-mass-prayer-email', {
      body: {
        action: 'add_subscriber',
        email,
        name
      }
    });
  } else {
    // Remove from Mailchimp
    await supabase.functions.invoke('send-mass-prayer-email', {
      body: {
        action: 'remove_subscriber',
        email
      }
    });
  }
}
```

## How It Works

### When Prayer is Approved
1. Admin clicks "Approve" in Admin Portal
2. `sendApprovedPrayerNotification()` checks `email_distribution` setting
3. **If `all_users`**: Calls Mailchimp Edge Function → sends mass email
4. **If `admin_only`**: Uses Resend → sends to admin emails only
5. Separate function sends personal confirmation to requester (via Resend)

### Email Flow Diagram
```
Prayer Approved
    ↓
Check email_distribution setting
    ↓
    ├─ "all_users" → Mailchimp (mass email to all subscribers)
    │                 ↓
    │              Edge Function creates campaign
    │                 ↓
    │              Sends to entire Mailchimp audience
    │
    └─ "admin_only" → Resend (transactional to admins)
                       ↓
                    Sends to admin_settings.notification_emails
```

## Testing

### Test Mailchimp Connection
```bash
# Test with a single prayer notification
curl -i --location 'https://your-project.supabase.co/functions/v1/send-mass-prayer-email' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "subject": "Test Prayer Request",
    "htmlContent": "<h1>Test Prayer</h1><p>This is a test.</p>",
    "textContent": "Test Prayer\n\nThis is a test.",
    "fromName": "Prayer App",
    "replyTo": "noreply@yourchurch.com"
  }'
```

### Verify Settings
```sql
-- Check your email distribution setting
SELECT email_distribution FROM admin_settings;

-- Should return: 'all_users' (for Mailchimp) or 'admin_only' (for Resend)
```

### Update Setting
```sql
-- To use Mailchimp for mass emails
UPDATE admin_settings 
SET email_distribution = 'all_users';

-- To use Resend for admin-only emails
UPDATE admin_settings 
SET email_distribution = 'admin_only';
```

## Cost Comparison

### Resend Free Tier
- ✅ 3,000 emails/month
- ✅ 100 emails/day
- ❌ Limited to transactional emails

### Mailchimp Free Tier
- ✅ 1,000 emails/month
- ✅ 500 contacts max
- ✅ Marketing/newsletter campaigns
- ✅ Better for mass distribution

## Best Practices

1. **Test in staging first**: Always test Mailchimp integration before production
2. **Monitor email counts**: Keep track of monthly email usage
3. **Verify domain**: Add your domain to Mailchimp for better deliverability
4. **Unsubscribe link**: Mailchimp automatically adds this to campaigns
5. **Sync subscribers**: Keep `email_subscribers` table and Mailchimp in sync

## Troubleshooting

### "API Key Invalid"
- Verify API key is correct in Supabase secrets
- Check that key hasn't been revoked in Mailchimp

### "Audience Not Found"
- Verify audience ID is correct
- Ensure audience still exists in Mailchimp

### "Campaign Not Sent"
- Check Mailchimp dashboard for campaign status
- Verify sender email is verified in Mailchimp
- Ensure audience has at least 1 subscriber

### Emails Not Arriving
- Check spam/junk folders
- Verify sender email is verified in Mailchimp
- Add SPF/DKIM records for your domain

## Files Modified

1. **src/lib/emailNotifications.ts**
   - Modified `sendApprovedPrayerNotification()` to route to Mailchimp or Resend based on setting
   - Added `sendMailchimpCampaign()` helper function

2. **supabase/functions/send-mass-prayer-email/index.ts**
   - Created Edge Function for Mailchimp integration
   - Handles campaign creation and sending
   - Manages subscriber add/remove

## Next Steps

1. ✅ Deploy Edge Function
2. ✅ Set environment variables
3. ✅ Test with a sample prayer
4. ✅ Sync existing subscribers to Mailchimp
5. ✅ Update `email_distribution` setting to `'all_users'`
6. Monitor email delivery and adjust as needed

## Support

- Mailchimp API Docs: https://mailchimp.com/developer/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Resend Docs: https://resend.com/docs
