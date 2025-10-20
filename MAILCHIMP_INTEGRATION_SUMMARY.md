# Mailchimp Integration Summary

## What Was Changed

### Goal
Split email notifications to use:
- **Resend** (free tier) for transactional admin emails
- **Mailchimp** (free tier) for mass subscriber notifications when prayers are approved

## Files Modified

### 1. src/lib/emailNotifications.ts
**Changes:**
- Modified `sendApprovedPrayerNotification()` to route based on `email_distribution` setting
- Added new `sendMailchimpCampaign()` function

**Logic Flow:**
```typescript
if (email_distribution === 'all_users') {
  // Use Mailchimp for mass email to all subscribers
  await sendMailchimpCampaign(payload);
} else {
  // Use Resend for admin-only transactional emails
  await invokeSendNotification({ to: adminEmails, ... });
}
```

### 2. supabase/functions/send-mass-prayer-email/index.ts
**Enhanced with three actions:**

#### Action 1: Send Campaign (default)
```typescript
// Automatically sends to ALL subscribers in Mailchimp audience
{
  "subject": "New Prayer Request: John's Health",
  "htmlContent": "<html>...</html>",
  "textContent": "Plain text version...",
  "fromName": "Prayer App",
  "replyTo": "noreply@yourchurch.com"
}
```

#### Action 2: Add Subscriber
```typescript
{
  "action": "add_subscriber",
  "email": "user@example.com",
  "name": "John Doe"
}
```

#### Action 3: Remove Subscriber
```typescript
{
  "action": "remove_subscriber",
  "email": "user@example.com"
}
```

## How It Works

### Automatic Email Flow When Prayer Approved

```
Admin clicks "Approve" in Admin Portal
    ↓
useAdminData.ts calls sendApprovedPrayerNotification()
    ↓
Check admin_settings.email_distribution
    ↓
    ├─ "all_users"
    │   ↓
    │   sendMailchimpCampaign()
    │   ↓
    │   supabase.functions.invoke('send-mass-prayer-email')
    │   ↓
    │   Mailchimp creates & sends campaign
    │   ↓
    │   📧 ALL subscribers receive email
    │
    └─ "admin_only"
        ↓
        invokeSendNotification()
        ↓
        Resend API
        ↓
        📧 Only admins receive email
```

### Manual Subscriber Management

When user opts in/out via EmailSubscribers component:
```
User clicks "Add Me to Email List"
    ↓
Insert into email_subscribers table (is_active = true)
    ↓
Sync with Mailchimp:
supabase.functions.invoke('send-mass-prayer-email', {
  body: { action: 'add_subscriber', email, name }
})
    ↓
Mailchimp audience updated
```

## Cost Management

### Resend Free Tier
- **Limit**: 3,000 emails/month, 100/day
- **Usage**: 
  - Admin approval notifications
  - Admin denial notifications
  - Personal requester confirmations
- **Estimate**: ~10-50 emails/day (well under limit)

### Mailchimp Free Tier
- **Limit**: 1,000 emails/month, 500 contacts max
- **Usage**:
  - Mass subscriber notifications when prayer approved
- **Estimate**: If you approve 5 prayers/week with 200 subscribers = 4,000 emails/month
  - ⚠️ Would exceed free tier! Consider upgrading to Essentials ($13/month for 5,000 emails)

## Setup Checklist

- [ ] 1. Create Mailchimp account
- [ ] 2. Create audience in Mailchimp
- [ ] 3. Get API key from Mailchimp
- [ ] 4. Get server prefix from Mailchimp URL
- [ ] 5. Get audience ID from Mailchimp
- [ ] 6. Set Supabase secrets:
  ```bash
  supabase secrets set MAILCHIMP_API_KEY="your-key"
  supabase secrets set MAILCHIMP_SERVER_PREFIX="us12"
  supabase secrets set MAILCHIMP_AUDIENCE_ID="your-id"
  ```
- [ ] 7. Deploy Edge Function:
  ```bash
  supabase functions deploy send-mass-prayer-email
  ```
- [ ] 8. Sync existing subscribers to Mailchimp
- [ ] 9. Update email_distribution setting:
  ```sql
  UPDATE admin_settings SET email_distribution = 'all_users';
  ```
- [ ] 10. Test with a prayer approval
- [ ] 11. Monitor email delivery

## Testing

### Test Mailchimp Connection
```bash
curl -i --location 'https://your-project.supabase.co/functions/v1/send-mass-prayer-email' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "subject": "Test Prayer Request",
    "htmlContent": "<h1>Test</h1>",
    "textContent": "Test",
    "fromName": "Prayer App",
    "replyTo": "noreply@yourchurch.com"
  }'
```

### Add Test Subscriber
```bash
curl -i --location 'https://your-project.supabase.co/functions/v1/send-mass-prayer-email' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "action": "add_subscriber",
    "email": "test@example.com",
    "name": "Test User"
  }'
```

### Check Setting
```sql
SELECT email_distribution FROM admin_settings;
-- Should return: 'all_users' or 'admin_only'
```

## Rollback Plan

If you need to revert back to Resend-only:

1. Update setting:
```sql
UPDATE admin_settings SET email_distribution = 'admin_only';
```

2. This will:
   - Keep Mailchimp Edge Function available for future use
   - Route all emails through Resend again
   - Not delete any Mailchimp subscribers (they stay in audience)

## Next Steps

1. Follow MAILCHIMP_MASS_EMAIL_SETUP.md for detailed setup
2. Deploy the Edge Function
3. Test with a sample prayer
4. Monitor email counts to stay within limits
5. Consider Mailchimp Essentials plan if volume exceeds free tier

## Support Resources

- Setup Guide: `MAILCHIMP_MASS_EMAIL_SETUP.md`
- Mailchimp API: https://mailchimp.com/developer/
- Supabase Functions: https://supabase.com/docs/guides/functions
