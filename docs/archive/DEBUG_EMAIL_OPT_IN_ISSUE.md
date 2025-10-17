# Debugging Email Opt-In Approval Process

## Issue
Not receiving emails for the email opt-in approval process.

## Root Cause
The `sendPreferenceChangeNotification()` function requires active admin email subscribers in the `email_subscribers` table. If there are no active subscribers, emails won't be sent.

## Solution Steps

### Step 1: Add Email Subscribers (Admin Portal)

1. **Navigate to Admin Portal**
   - Click "Admin" button in the main app
   - Log in with your admin credentials

2. **Go to Email Settings Tab**
   - Click on "Email Settings" tab in the Admin Portal
   - This shows the EmailSubscribers component

3. **Add Admin Email Addresses**
   - Click the "+ Add Email Subscriber" button
   - Enter Name and Email address
   - Click "Add Subscriber"
   - The subscriber will be automatically set to "Active"

4. **Verify Subscribers**
   - Check that at least one subscriber shows as "Active" (green checkmark)
   - Inactive subscribers (red X) will NOT receive emails

### Step 2: Test the Email Flow

1. **Submit a Preference Change**
   - In the main app, click Settings icon
   - Enter your name and email
   - Toggle "Receive new prayer notifications"
   - Click "Submit for Approval"

2. **Check Console Logs**
   - Open browser DevTools (F12)
   - Look for any error messages in the Console tab
   - Look for these specific messages:
     - ✅ Success: Email function invoked successfully
     - ❌ Error: "No active admin email subscribers found"
     - ❌ Error: "Error fetching admin emails"
     - ❌ Error: "Error sending preference change notification"

3. **Verify in Admin Portal**
   - Go to Admin Portal
   - Click "Preferences" tab
   - You should see the pending preference change request

4. **Check Email Inbox**
   - Check the inbox for the email address(es) you added as subscribers
   - Look for email with subject: "New Notification Preference Change: [Name]"
   - Check spam/junk folder if not in inbox

### Step 3: Verify Database Tables

If emails still aren't working, check these database tables:

1. **email_subscribers table**
   ```sql
   SELECT * FROM email_subscribers WHERE is_active = true;
   ```
   - Should return at least one row
   - Email addresses should be valid

2. **pending_preference_changes table**
   ```sql
   SELECT * FROM pending_preference_changes ORDER BY created_at DESC LIMIT 5;
   ```
   - Should show recent preference change requests

### Step 4: Verify Edge Function

The email system uses Supabase Edge Function `send-notification`:

1. **Check if function exists**
   - Navigate to Supabase Dashboard
   - Go to Edge Functions
   - Verify `send-notification` function is deployed

2. **Check function logs**
   - Click on the `send-notification` function
   - Check logs for any errors
   - Look for successful email sends

## Common Issues & Solutions

### Issue 1: "No active admin email subscribers found"
**Solution:** Add at least one active email subscriber in Admin Portal → Email Settings

### Issue 2: Email subscriber exists but emails not sent
**Possible causes:**
- Edge function not deployed
- Edge function has errors
- Email service (Resend) not configured
- API key missing or invalid

### Issue 3: Emails sent but not received
**Possible causes:**
- Emails in spam/junk folder
- Email address typo
- Email service rate limits
- Domain verification issues (if using custom domain)

### Issue 4: Console shows "Error invoking function"
**Solution:** 
- Check Supabase Edge Function logs
- Verify Edge Function is deployed
- Check environment variables (RESEND_API_KEY)

## Code Reference

### Email Notification Function Location
File: `src/lib/emailNotifications.ts`
Function: `sendPreferenceChangeNotification()`

Key code section:
```typescript
// Get admin email list from email_subscribers table
const { data: subscribers, error: subscribersError } = await supabase
  .from('email_subscribers')
  .select('email')
  .eq('is_active', true);

if (subscribersError) {
  console.error('Error fetching admin emails:', subscribersError);
  return;
}

if (!subscribers || subscribers.length === 0) {
  console.warn('No active admin email subscribers found.');
  return;
}
```

### Where It's Called
File: `src/components/UserSettings.tsx`
Function: `savePreferences()`

```typescript
// Send admin notification email
await sendPreferenceChangeNotification({
  name: name.trim(),
  email: emailLower,
  receiveNotifications
});
```

## Quick Test Checklist

- [ ] At least one active subscriber in `email_subscribers` table
- [ ] Edge Function `send-notification` is deployed
- [ ] RESEND_API_KEY environment variable is set
- [ ] Preference change submitted successfully (check admin portal)
- [ ] No errors in browser console
- [ ] No errors in Edge Function logs
- [ ] Email address is valid and accessible
- [ ] Checked spam/junk folder

## Next Steps

1. **First:** Add email subscribers in Admin Portal → Email Settings
2. **Then:** Submit a test preference change
3. **Finally:** Check console logs and email inbox

If issues persist after following these steps, check:
- Supabase Edge Function deployment status
- Resend API configuration
- Email service logs in Resend dashboard
