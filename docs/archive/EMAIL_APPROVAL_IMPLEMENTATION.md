# Email Approval Notification Implementation

## Overview
This implementation adds email notification functionality that sends emails to users when prayers and updates are approved by admins. The system includes an admin setting to control distribution scope (admin only vs all users).

## Files Modified

### 1. `src/lib/emailNotifications.ts`
**Added:**
- `ApprovedPrayerPayload` interface - defines data structure for approved prayer emails
- `ApprovedUpdatePayload` interface - defines data structure for approved update emails
- `sendApprovedPrayerNotification()` - sends emails when a prayer is approved
- `sendApprovedUpdateNotification()` - sends emails when an update is approved
- `generateApprovedPrayerHTML()` - creates HTML template for approved prayer emails
- `generateApprovedUpdateHTML()` - creates HTML template for approved update emails

**Functionality:**
- Fetches `email_distribution` setting from admin_settings table
- If `admin_only`: sends to emails in notification_emails array
- If `all_users`: fetches all unique emails from prayers table and sends to all
- Uses existing Supabase Edge Function (`send-notification`) for email delivery
- Includes styled HTML templates with green gradient headers and CTA buttons

### 2. `src/hooks/useAdminData.ts`
**Modified:**
- Added import for `sendApprovedPrayerNotification` and `sendApprovedUpdateNotification`
- Updated `approvePrayer()` function:
  - Now fetches full prayer details before approval
  - Sends email notification after successful approval
  - Includes prayer title, description, requester, prayer_for, and status in payload
- Updated `approveUpdate()` function:
  - Now fetches update details with prayer title before approval
  - Sends email notification after successful approval
  - Includes prayer title, content, and author in payload

### 3. `src/components/EmailSettings.tsx`
**Modified:**
- Added `emailDistribution` state variable (type: `'admin_only' | 'all_users'`)
- Updated `loadEmails()` to fetch and set `email_distribution` from database
- Updated `saveEmails()` to save `email_distribution` setting
- Added UI section for email distribution preference with radio buttons:
  - **Admin Only**: Only admin emails receive notifications
  - **All Users**: All email addresses in database receive notifications
- Styled with gray background box, clear labels, and descriptive help text

### 4. `supabase/migrations/003_add_email_distribution_setting.sql`
**Created new migration:**
```sql
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS email_distribution VARCHAR(20) 
CHECK (email_distribution IN ('admin_only', 'all_users'))
DEFAULT 'admin_only';
```

## Email Templates

### Approved Prayer Email
- **Subject:** "New Prayer Request: {title}"
- **Header:** Green gradient with "🙏 New Prayer Request"
- **Content:** Title, For, Requested by, Status, Description
- **CTA:** "View Prayer" button linking to app
- **Style:** Clean, professional, mobile-responsive

### Approved Update Email
- **Subject:** "Prayer Update: {prayerTitle}"
- **Header:** Green gradient with "💬 Prayer Update"
- **Content:** Prayer title, Posted by, Update content
- **CTA:** "View Prayer" button linking to app
- **Style:** Matches prayer email template

## How It Works

### Approval Flow
1. Admin clicks "Approve" on a pending prayer or update
2. System fetches full details of the item
3. Database record is updated to `approval_status = 'approved'`
4. Email notification function is called with item details
5. Function checks `email_distribution` setting in admin_settings
6. Recipients list is determined:
   - `admin_only`: Uses notification_emails array from admin_settings
   - `all_users`: Queries prayers table for all unique non-null emails
7. HTML email is generated using template functions
8. Email is sent via Supabase Edge Function to all recipients
9. Admin data is refreshed to show updated status

### Email Distribution Logic
```typescript
if (settings?.email_distribution === 'all_users') {
  // Get all unique emails from prayers table
  const { data: prayerEmails } = await supabase
    .from('prayers')
    .select('email')
    .not('email', 'is', null)
    .neq('email', '');
  recipients = [...new Set(prayerEmails.map(p => p.email))];
} else {
  // Default to admin_only
  recipients = settings?.notification_emails || [];
}
```

## Setup Instructions

### 1. Apply Migration
Run the migration to add the `email_distribution` column:
```bash
psql -U postgres -d your_database -f supabase/migrations/003_add_email_distribution_setting.sql
```

Or use Supabase CLI:
```bash
supabase db push
```

### 2. Configure Admin Settings
1. Log into Admin Portal
2. Go to Settings tab
3. Under "Email Notifications":
   - Add admin email addresses to receive notifications
   - Select distribution preference:
     - **Admin Only** (default): Only admins get emails
     - **All Users**: Everyone in database gets emails
4. Click "Save Settings"

### 3. Test Email Flow
1. Submit a new prayer request (as regular user)
2. Log into Admin Portal
3. Approve the prayer
4. Check configured email inboxes for notification
5. Repeat for prayer updates

## Error Handling
- All email functions wrapped in try-catch blocks
- Errors logged to console but don't block approval process
- If email_distribution setting missing, defaults to 'admin_only'
- If no recipients found, logs warning and continues
- Failed email sends logged but don't throw errors to user

## Security Considerations
- Email addresses fetched using Supabase RLS policies
- Only authenticated admins can modify email settings
- Email distribution respects admin_settings table permissions
- Edge Function invocation requires proper authentication
- No email addresses exposed to frontend unnecessarily

## Future Enhancements
- Add notification_log table to track sent emails
- Add email templates for other notification types (denials, deletions)
- Add user preference for opting in/out of email notifications
- Add batch email scheduling for digest notifications
- Add email preview feature in admin portal
