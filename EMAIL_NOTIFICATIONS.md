# Email Notification Setup Guide

This guide explains how to set up email notifications for admin alerts when new prayer requests or updates are submitted.

## Overview

The prayer app includes a configurable email notification system that sends alerts to administrators when:
- A new prayer request is submitted (pending approval)
- A new prayer update is added (pending approval)

## Configuration

### 1. Configure Admin Email Addresses

1. Log in to the Admin Portal
2. Navigate to the **Settings** tab
3. Under **Email Notifications**, add admin email addresses
4. Click **Save Settings**

### 2. Set Up Email Sending Service

The current implementation includes a notification framework but requires you to connect an actual email service. Choose one of the following options:

#### Option A: Supabase Edge Function (Recommended)

1. Create a Supabase Edge Function:
```bash
supabase functions new send-notification
```

2. Implement the function using a service like Resend, SendGrid, or AWS SES:

```typescript
// supabase/functions/send-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { to, subject, body, html } = await req.json()
  
  // Example using Resend
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Prayer App <notifications@yourdomain.com>',
      to: to,
      subject: subject,
      text: body,
      html: html
    })
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

3. Deploy the function:
```bash
supabase functions deploy send-notification
```

4. Uncomment the Edge Function code in `src/lib/emailNotifications.ts`:
```typescript
const { error: functionError } = await supabase.functions.invoke('send-notification', {
  body: {
    to: emails,
    subject,
    body,
    html: generateEmailHTML(payload)
  }
});
```

#### Option B: Direct Email Service Integration

1. Choose an email service (e.g., SendGrid, Mailgun, Resend, AWS SES)
2. Add environment variables:
```env
VITE_EMAIL_SERVICE_URL=https://api.yourservice.com/send
VITE_EMAIL_SERVICE_KEY=your_api_key
```

3. Uncomment and configure the email service code in `src/lib/emailNotifications.ts`:
```typescript
const emailServiceUrl = import.meta.env.VITE_EMAIL_SERVICE_URL;
const emailServiceKey = import.meta.env.VITE_EMAIL_SERVICE_KEY;

await fetch(emailServiceUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${emailServiceKey}`
  },
  body: JSON.stringify({
    to: emails,
    subject,
    text: body,
    html: generateEmailHTML(payload)
  })
});
```

## Database Setup

Run the migration to create the `admin_settings` table:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the migration:
# supabase/migrations/create_admin_settings.sql
```

The migration creates:
- `admin_settings` table for storing notification email addresses
- Row Level Security policies for authenticated users
- Automatic timestamp updates

## Testing

1. Add a test email address in the Settings tab
2. Submit a new prayer request from the main app
3. Check that:
   - The prayer appears in the Admin Portal's "Pending Prayer Requests"
   - Console logs show the notification attempt
   - (After email service setup) Email is received

## Email Templates

The notification emails include:
- HTML formatted messages with branding
- Direct link to the Admin Portal
- Prayer/update details
- Responsive design for mobile viewing

Templates can be customized in `src/lib/emailNotifications.ts` in the `generateEmailHTML()` function.

## Troubleshooting

### Emails not being triggered
- Check browser console for errors
- Verify email addresses are saved in Settings
- Ensure the admin_settings table exists

### Emails not being sent (after service setup)
- Verify API keys and environment variables
- Check Supabase Edge Function logs: `supabase functions logs send-notification`
- Verify email service account is active and has sending credits
- Check spam folder

### Database errors
- Ensure migrations have been applied
- Verify RLS policies are configured correctly
- Check that authenticated users have proper permissions

## Production Considerations

1. **Email Service Limits**: Monitor your email service usage and rate limits
2. **Spam Prevention**: Configure SPF, DKIM, and DMARC records
3. **Unsubscribe**: Consider adding unsubscribe functionality for email recipients
4. **Error Handling**: Email failures should not break the prayer submission process
5. **Rate Limiting**: Consider implementing rate limits to prevent abuse
6. **Logging**: Set up proper logging for notification attempts and failures

## Future Enhancements

Potential improvements to the notification system:
- SMS notifications via Twilio
- Push notifications for mobile apps
- Digest emails (daily/weekly summaries)
- Notification preferences per admin
- Notification history/audit log
- Template customization UI
- Multiple language support
