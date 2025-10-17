# Quick Start: Email Approval Notifications

## What This Does
When you approve a prayer or update in the Admin Portal, an email is automatically sent to notify users. You can control who receives these emails.

## Setup Steps

### 1. Apply Database Migration
First, add the new column to your database:

**Option A: Using psql**
```bash
psql -U postgres -d your_database_name -f supabase/migrations/003_add_email_distribution_setting.sql
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Open `supabase/migrations/003_add_email_distribution_setting.sql`
4. Copy the SQL and paste into the SQL Editor
5. Click "Run"

**Option C: Using Supabase CLI** (if you have it installed)
```bash
supabase db push
```

### 2. Configure Email Settings
1. Open your Prayer App
2. Log into the Admin Portal
3. Click the "Settings" tab
4. In the "Email Notifications" section:
   - Add admin email addresses (click "Add" after typing each)
   - Choose email distribution:
     - ✅ **Admin Only** - Only admins get notified (recommended for testing)
     - ✅ **All Users** - Everyone in the database gets notified
5. Click "Save Settings"

### 3. Test It Out
1. Submit a test prayer request
2. Go to Admin Portal → Pending Prayers
3. Click "Approve" on the test prayer
4. Check your email inbox(es)
5. You should receive an email with the prayer details

## Email Distribution Options

### Admin Only (Default)
- Emails sent ONLY to addresses in the admin notification list
- Best for: Internal review process, small teams
- Use when: You want admins to coordinate before wider announcement

### All Users
- Emails sent to ALL unique email addresses in the prayers table
- Best for: Community engagement, public prayer lists
- Use when: You want everyone to know about new approved prayers

## What Gets Emailed

### When a Prayer is Approved:
- Prayer title
- Who it's for
- Who requested it
- Current status
- Full description
- Link to view in app

### When an Update is Approved:
- Which prayer it's for
- Who posted the update
- Update content
- Link to view in app

## Troubleshooting

### "No email received"
- Check spam/junk folder
- Verify admin emails are saved in Settings
- Check Supabase Edge Function logs
- Ensure `send-notification` Edge Function is deployed

### "Error saving settings"
- Make sure migration was applied successfully
- Check browser console for errors
- Verify you're logged in as admin

### "Email sent to wrong people"
- Check your distribution setting (Admin Only vs All Users)
- For "All Users", check which emails exist in prayers table:
  ```sql
  SELECT DISTINCT email FROM prayers WHERE email IS NOT NULL;
  ```

## Tips

- **Start with "Admin Only"** to test before sending to all users
- **Keep admin email list updated** as team members change
- **Monitor Edge Function logs** in Supabase dashboard for send issues
- **Test with dummy prayers** before going live

## Next Steps

After confirming emails work:
1. Add production admin emails
2. Choose appropriate distribution setting
3. Train admins on approval workflow
4. Consider setting up email templates in your provider
5. Monitor email delivery rates

## Support

If emails aren't working:
1. Check Supabase Edge Function logs
2. Verify `send-notification` function is deployed
3. Check email provider settings (Resend, SendGrid, etc.)
4. Review browser console for JavaScript errors
5. Check database for `admin_settings` table structure
