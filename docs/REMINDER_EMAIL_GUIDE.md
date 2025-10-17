# Prayer Update Reminder Feature

## Overview
This feature automatically sends email reminders to prayer requesters at configurable intervals, encouraging them to update their prayer requests with answered prayers, changes, or ongoing needs.

## How It Works

### 1. Admin Configuration
- Admins can set the reminder interval (in days) in the Settings tab of the Admin Portal
- The setting is located in the "Prayer Update Reminders" section
- Default value: 7 days
- Range: 1-90 days
- Set to 0 to disable reminder emails

### 2. Reminder Logic
The system sends reminder emails to prayer requesters for prayers that meet ALL of these criteria:
- Status is "current" OR "ongoing"
- Approval status is "approved"
- Has a valid email address
- Has NOT had any updates posted in the last X days (where X = reminder_interval_days)
  - If the prayer has updates, checks the date of the most recent update
  - If the prayer has no updates, checks the prayer creation date
  - Only sends reminder if this date is older than the interval

### 3. Manual Trigger
Admins can manually trigger reminder emails by clicking the "Send Reminders Now" button in the Settings tab. This is useful for:
- Testing the feature
- Sending immediate reminders after changing the interval
- Catching up on reminders

### 4. Tracking
- The system checks the `prayer_updates` table for each prayer
- If updates exist, uses the most recent update date
- If no updates exist, uses the prayer creation date
- No additional tracking column needed - uses existing data

## Database Changes

### Migration File
`supabase/migrations/007_add_prayer_reminder_settings.sql`

**Adds one column:**

`reminder_interval_days` to `admin_settings` table:
```sql
ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS reminder_interval_days INTEGER DEFAULT 7;
```

This column stores the number of days of inactivity (no updates) before sending a reminder.

**Note:** This implementation checks the date of the last update, not the last reminder sent. This means:
- If a prayer has updates, it checks when the last update was posted
- If a prayer has no updates, it checks when the prayer was created
- Reminders are only sent if there's been no activity for X days

## Edge Function

### Function Location
`supabase/functions/send-prayer-reminders/index.ts`

### Function Logic
1. Fetches the `reminder_interval_days` setting from admin_settings
2. If disabled (0 or null), returns early
3. Calculates cutoff date (current date - reminder_interval_days)
4. Finds all prayers that are:
   - Status: "current" or "ongoing"
   - Approval status: "approved"
5. For each prayer:
   - Checks if it has any updates
   - Gets the most recent update date (or creation date if no updates)
   - If last activity was before cutoff date, adds to reminder list
6. Sends personalized reminder email to each requester
7. Updates `last_reminder_sent` timestamp
8. Returns count of emails sent and any errors

### Email Content
The reminder email includes:
- Personalized greeting (uses requester name or "Friend" if anonymous)
- Prayer title and "prayer for" information
- Explanation of why updates are valuable
- Direct link to visit the prayer app
- Prayer submission date and last reminder date
- Encouraging tone from "The Prayer Team"

### Invoking the Function
```typescript
const { data, error } = await supabase.functions.invoke('send-prayer-reminders');
```

Response format:
```json
{
  "message": "Successfully sent X reminder emails",
  "sent": 5,
  "total": 5,
  "errors": []
}
```

## Setting Up Automatic Execution

### Option 1: Supabase Cron (Recommended)
Set up a Supabase cron job to run the function daily:

1. In Supabase Dashboard, go to Database → Extensions
2. Enable the `pg_cron` extension
3. Run this SQL to schedule daily execution:

```sql
SELECT cron.schedule(
  'send-prayer-reminders-daily',
  '0 8 * * *', -- Run at 8 AM every day
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-prayer-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);
```

### Option 2: External Cron Service
Use a service like:
- GitHub Actions with scheduled workflows
- Cron-job.org
- EasyCron
- Your own server's cron

Example GitHub Actions workflow:
```yaml
name: Send Prayer Reminders
on:
  schedule:
    - cron: '0 8 * * *' # 8 AM daily
jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-prayer-reminders' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}'
```

### Option 3: Client-Side Trigger
For smaller deployments, trigger when admins log in:

```typescript
// In AdminPortal.tsx or similar
useEffect(() => {
  const checkReminders = async () => {
    const lastRun = localStorage.getItem('lastReminderCheck');
    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    if (!lastRun || now - parseInt(lastRun) > oneDayMs) {
      await supabase.functions.invoke('send-prayer-reminders');
      localStorage.setItem('lastReminderCheck', now.toString());
    }
  };
  
  checkReminders();
}, []);
```

## UI Components Modified

### EmailSettings.tsx
- Added state for `reminderIntervalDays`
- Added input field for days configuration
- Added "Send Reminders Now" button
- Added `runReminderCheck()` function
- Updated load/save functions to handle reminder_interval_days

## Email Template

The reminder email features:
- **Blue gradient header** with bell emoji 🔔
- **Personalized greeting** (respects anonymous flag)
- **Prayer details** in highlighted blue box
- **"Why update?" section** with bullet points explaining the value
- **Call to action** button linking to the app
- **Prayer metadata** showing submission date and last reminder
- **Encouraging footer** from "The Prayer Team"
- **Responsive HTML** styling for all devices

## Privacy & Considerations

### Anonymous Prayers
- Reminders respect the `is_anonymous` flag
- Email greeting uses "Friend" instead of requester name
- Email content doesn't reveal identity to recipients

### Email Requirements
- Only prayers with valid email addresses receive reminders
- Prayers without emails are skipped (logged but not counted as errors)

### Frequency Control
- `last_reminder_sent` timestamp prevents spam
- Respects admin-configured interval
- No reminders sent more frequently than configured

## Testing

### Test the Feature
1. Set `reminder_interval_days` to 1 in admin settings
2. Create and approve a test prayer with your email
3. Click "Send Reminders Now"
4. Check your email for the reminder
5. Verify `last_reminder_sent` is updated in database
6. Try clicking again - should see "0 reminders sent" (too soon)
7. Manually set `last_reminder_sent` to 2 days ago:
   ```sql
   UPDATE prayers 
   SET last_reminder_sent = NOW() - INTERVAL '2 days'
   WHERE id = 'your-prayer-id';
   ```
8. Click "Send Reminders Now" again - should receive another reminder

### Verify the Function
```bash
# Test the edge function directly
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-prayer-reminders' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

### Test Different Scenarios

**Scenario 1: Never reminded**
- Create new prayer, approve it
- Should receive reminder immediately when triggered

**Scenario 2: Recently reminded**
- Prayer with `last_reminder_sent` = today
- Should NOT receive reminder (too soon)

**Scenario 3: Ready for reminder**
- Prayer with `last_reminder_sent` older than interval
- Should receive reminder

**Scenario 4: Closed/Answered prayers**
- Prayers with status 'answered' or 'closed'
- Should NOT receive reminders

**Scenario 5: Pending prayers**
- Prayers with approval_status 'pending' or 'denied'
- Should NOT receive reminders

## Deployment Checklist

- [ ] Apply migration: `007_add_prayer_reminder_settings.sql`
- [ ] Deploy edge function: `send-prayer-reminders`
- [ ] Configure cron job (optional but recommended)
- [ ] Test with sample prayer
- [ ] Configure desired interval in admin settings
- [ ] Verify email delivery
- [ ] Check spam folders if emails not received
- [ ] Document the feature for other admins

## Monitoring & Maintenance

### Check Reminder Logs
View function logs in Supabase Dashboard:
- Functions → send-prayer-reminders → Logs
- Look for successful sends and any errors

### Common Issues

**No emails sent:**
- Check if reminder_interval_days > 0
- Verify prayers meet criteria (status, approval_status)
- Check if enough time has passed since last reminder
- Verify prayers have valid email addresses

**Emails going to spam:**
- Configure SPF/DKIM records for your domain
- Ask users to whitelist your email sender
- Ensure email content isn't flagged as spam

**Too many/too few reminders:**
- Adjust reminder_interval_days setting
- Check `last_reminder_sent` timestamps in database
- Verify cron job frequency

## Future Enhancements

Potential improvements:
- Customizable email templates via admin portal
- Different reminder intervals for different prayer statuses
- "Snooze" option for users to delay next reminder
- Reminder preferences per user (opt-in/opt-out)
- Multiple reminder types (weekly digest, urgent updates)
- Analytics showing reminder open/click rates
- Reminder history log for audit trail
- A/B testing of email content
