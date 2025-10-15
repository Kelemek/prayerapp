# Prayer Reminder Emails - Implementation Summary

## What Was Implemented

### 1. **Admin Setting for Reminder Interval**
   - Added `reminder_interval_days` field to admin_settings table
   - Default value: 7 days
   - Configurable range: 1-90 days (or 0 to disable)
   - **What it means:** "Send reminder if there have been NO updates for X days"

### 2. **Smart Activity Tracking**
   - Checks the `prayer_updates` table for last activity
   - Uses most recent update date (if updates exist)
   - Falls back to prayer creation date (if no updates)
   - **No additional column needed** - uses existing data!

### 3. **UI in Admin Portal Settings**
   - Input field to set reminder interval in days
   - "Send Reminders Now" button for manual triggering
   - Clear instructions and help text
   - Located in "Prayer Update Reminders" section

### 4. **Supabase Edge Function**
   - `send-prayer-reminders` function
   - Checks for prayers with no recent activity (no updates)
   - Sends personalized reminder emails to prayer requesters
   - Only targets "current" or "ongoing" approved prayers
   - Smart logic - only reminds if inactive for X days
   - Returns count of emails sent

### 5. **Beautiful Email Template**
   - Blue gradient header with bell emoji 🔔
   - Personalized greeting (respects anonymous flag)
   - Prayer details in highlighted section
   - "Why update?" section explaining the value
   - Call-to-action button to visit the app
   - Prayer metadata (submission date, last reminder)
   - Encouraging footer from "The Prayer Team"

## Files Created/Modified

### Created Files:
1. `/supabase/migrations/007_add_prayer_reminder_settings.sql` - Database migration (just reminder_interval_days column)
2. `/supabase/functions/send-prayer-reminders/index.ts` - Edge function with activity-based logic
3. `/REMINDER_EMAIL_GUIDE.md` - Complete documentation
4. `/REMINDER_EMAIL_IMPLEMENTATION.md` - This summary
5. `/REMINDER_LOGIC_EXPLAINED.md` - Detailed explanation of the activity-based approach

### Modified Files:
1. `/src/components/EmailSettings.tsx`:
   - Added `reminderIntervalDays` state (default: 7)
   - Added UI for reminder interval input
   - Added "Send Reminders Now" button with orange styling
   - Added `runReminderCheck()` function
   - Updated `loadEmails()` to fetch reminder_interval_days
   - Updated `saveEmails()` to save reminder_interval_days

## How It Works

### User Flow:
1. **User submits prayer** with email address (required)
2. **Admin approves** the prayer → status becomes "approved"
3. **Time passes** - prayer remains "current" or transitions to "ongoing"
4. **System checks** (via cron or manual trigger):
   - Is reminder interval > 0? (enabled)
   - Is prayer "current" or "ongoing"?
   - Is prayer "approved"?
   - Has it been X days since last reminder (or never reminded)?
5. **Email sent** to requester encouraging them to add an update
6. **Timestamp updated** - `last_reminder_sent` = now
7. **Wait interval** - no more reminders until interval passes again

### Technical Flow:
```
Admin Portal Settings
  └─> Set reminder_interval_days (e.g., 7)
  └─> Save to admin_settings table

Cron Job / Manual Trigger
  └─> Invoke send-prayer-reminders function
  
Edge Function
  └─> Get reminder_interval_days setting
  └─> Calculate cutoff date (now - interval)
  └─> Query all current/ongoing approved prayers
  └─> For each prayer:
      • Query most recent update (if any)
      • Determine last activity date:
        - If has updates: date of most recent update
        - If no updates: prayer creation date
      • If last activity < cutoff date:
        - Add to reminder list
  └─> For each prayer needing reminder:
      • Generate personalized email
      • Send via send-notification function
      • Update last_reminder_sent timestamp
  └─> Return count of emails sent
```

## Benefits

✅ **Keeps prayer requesters engaged** - Reminds them to share updates  
✅ **Encourages community** - More updates = more engagement  
✅ **Celebrates answered prayers** - Users prompted to share good news  
✅ **Configurable by admins** - Adjust frequency to fit community needs  
✅ **Prevents spam** - Respects intervals, tracks last sent  
✅ **Privacy-friendly** - Respects anonymous submissions  
✅ **Beautiful emails** - Professional, encouraging design  
✅ **Easy testing** - Manual trigger button for admins  

## Next Steps for Deployment

### 1. Apply Database Migration
```sql
-- Run this in Supabase SQL Editor
-- (or apply migration file 007_add_prayer_reminder_settings.sql)
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS reminder_interval_days INTEGER DEFAULT 7;
ALTER TABLE prayers ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMP WITH TIME ZONE;
```

### 2. Deploy Edge Function
```bash
supabase functions deploy send-prayer-reminders
```

### 3. Configure in Admin Portal
- Go to Admin Portal → Settings tab
- Scroll to "Prayer Update Reminders"
- Set desired interval (e.g., 7 days)
- Click Save

### 4. Test It
- Click "Send Reminders Now" button
- Check your test prayer requester's email
- Verify email received
- Check database: `last_reminder_sent` should be updated

### 5. Set Up Automated Execution (Optional but Recommended)
Choose one:
- **Option A:** Supabase Cron (best for production)
- **Option B:** GitHub Actions workflow
- **Option C:** External cron service
- **Option D:** Client-side trigger on admin login

See `REMINDER_EMAIL_GUIDE.md` for detailed setup instructions.

## Configuration Recommendations

### For Active Communities (high engagement):
- **Interval:** 7-10 days
- **Why:** Frequent updates keep community engaged
- **Best for:** Churches, small groups, accountability partners

### For Larger Communities (moderate engagement):
- **Interval:** 14-21 days
- **Why:** Prevents email fatigue, respects users' time
- **Best for:** Large churches, ministries, public prayer groups

### For Long-term Prayer Needs:
- **Interval:** 30 days
- **Why:** Ongoing situations don't change rapidly
- **Best for:** Chronic illness, long-term missions, sustained needs

### To Disable:
- **Interval:** 0
- **Why:** No reminder emails will be sent
- **Best for:** Testing, temporary pause, manual-only mode

## Testing Checklist

- [ ] Migration applied successfully
- [ ] Edge function deployed
- [ ] Admin settings UI shows reminder interval input
- [ ] Can save reminder interval setting
- [ ] "Send Reminders Now" button appears
- [ ] Clicking button triggers function
- [ ] Reminder email received for eligible prayer
- [ ] Email content looks correct (prayer details, formatting)
- [ ] `last_reminder_sent` updated in database
- [ ] Second immediate trigger sends 0 emails (respects interval)
- [ ] After interval passes, reminder can be sent again
- [ ] Anonymous prayers use "Friend" instead of name
- [ ] Answered/closed prayers don't receive reminders
- [ ] Pending prayers don't receive reminders

## Monitoring

### Check Reminder Activity:
```sql
-- See prayers that have been reminded
SELECT id, title, requester, email, status, last_reminder_sent
FROM prayers
WHERE last_reminder_sent IS NOT NULL
ORDER BY last_reminder_sent DESC;

-- See prayers due for reminder
SELECT id, title, requester, status, 
       COALESCE(last_reminder_sent, created_at) as last_contact,
       NOW() - COALESCE(last_reminder_sent, created_at) as days_since_contact
FROM prayers
WHERE status IN ('current', 'ongoing')
  AND approval_status = 'approved'
  AND (last_reminder_sent IS NULL 
       OR last_reminder_sent < NOW() - INTERVAL '7 days')
ORDER BY last_contact;
```

### View Function Logs:
- Supabase Dashboard → Functions → send-prayer-reminders → Logs
- Look for "Sent reminder for prayer X" messages
- Check for any errors

## Troubleshooting

### No emails being sent:
- Check `reminder_interval_days` > 0 in admin_settings
- Verify prayers meet criteria (current/ongoing, approved)
- Check if enough time has passed since last reminder
- Ensure prayers have valid email addresses

### Emails going to spam:
- Configure SPF/DKIM for your domain
- Ask users to whitelist sender
- Check email content isn't triggering spam filters

### Too many reminders:
- Increase `reminder_interval_days` value
- Verify `last_reminder_sent` is being updated correctly

### Too few reminders:
- Decrease `reminder_interval_days` value
- Ensure cron job is running regularly
- Check that prayers have status current/ongoing

## Integration with Existing Features

### Works With:
- ✅ **Email notifications** - Uses same send-notification function
- ✅ **Anonymous prayers** - Respects is_anonymous flag
- ✅ **Auto-transition** - Sends reminders for both current and ongoing
- ✅ **Status changes** - Stops reminders when answered/closed
- ✅ **Admin approval** - Only reminds for approved prayers

### Complements:
- **Prayer updates** - Encourages users to add updates
- **Community engagement** - Keeps requesters involved
- **Answered prayers** - Prompts sharing of good news
- **Long-term prayers** - Maintains connection over time

## Success Metrics

Track these to measure effectiveness:
- **Reminder emails sent** - Function returns count
- **Updates added after reminder** - Compare update timestamps
- **Email open rate** - If using email tracking service
- **User feedback** - Survey users about reminder frequency
- **Community engagement** - More updates = healthier community

## Future Enhancement Ideas

Consider adding:
- User preferences for reminder frequency
- "Snooze" option to delay next reminder
- Different intervals for different prayer types
- Weekly digest of all prayers instead of individual emails
- Reminder scheduling (e.g., only on Mondays)
- Customizable email templates via admin UI
- Reminder history/analytics dashboard
- A/B testing of email content
