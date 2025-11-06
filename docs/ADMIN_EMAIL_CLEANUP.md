# Admin Email Notifications Cleanup

## Date: November 5, 2024

## Changes Made

### 1. Database Migration
- **File**: `supabase/migrations/20251105000001_add_receive_admin_emails.sql`
- Added `receive_admin_emails` boolean column to `email_subscribers` table (default: `true`)
- Created index on `receive_admin_emails` for efficient filtering
- Allows admins to opt-in/opt-out of receiving admin notification emails

### 2. EmailSettings Component Cleanup
- **Removed**: "Send Approved Prayer Emails To" section (admin_only vs all_users distribution)
- **Removed**: "Reply-To Email Address" section
- **Removed**: "Send Test Email" functionality
- **Simplified**: Email settings now focuses on Email Verification (2FA) only
- **Renamed**: "Email Distribution" section → "Email Verification (2FA)" section
- **Removed unused state variables**:
  - `emailDistribution`
  - `replyToEmail`
  - `sendingTestEmail`
  - `successTestEmail`
- **Removed unused imports**:
  - `Send` icon
  - `sendEmailToAllSubscribers` function

### 3. AdminUserManagement Component Enhancements
- **Added**: `receive_admin_emails` field to `AdminUser` interface
- **Added**: `toggleReceiveEmails()` function to toggle admin email preferences
- **Added**: Green checkmark (✓) / Gray X toggle button for each admin
  - Green checkmark: Admin is receiving email notifications
  - Gray X: Admin is not receiving email notifications
- **Added**: Summary showing "X of Y admins receiving email notifications"
- **Updated**: Help text to explain the checkmark toggle functionality
- **Visual consistency**: Matches the EmailSubscribers component's `is_active` toggle

## Rationale

With the working Microsoft Graph API email notifications, we no longer need:

1. **Email Distribution Settings**: The old "admin_only" vs "all_users" distribution model is obsolete. Email notifications are now handled by:
   - Email subscribers (managed in EmailSubscribers component)
   - Admin users (managed in AdminUserManagement component with opt-in/opt-out)

2. **Reply-To Email**: This was a configuration detail that's now handled directly in the email sending logic. No need for a user-configurable setting.

3. **Test Email Function**: No longer needed as we have working email notifications that can be tested through normal app usage.

## Admin Email Notification Flow

### Two Types of Email Notifications:

#### 1. Admin Notifications (For Approvals)
**When**: New items require admin approval
**Recipients**: Admins with `is_admin = true AND is_active = true AND receive_admin_emails = true`
**Function**: `sendAdminNotification()`
**Use Cases**:
- New prayer request pending approval
- New prayer update pending approval  
- Deletion request pending approval
- Status change request pending approval

#### 2. Subscriber Notifications (For Approved Content)
**When**: Content is approved and published
**Recipients**: ALL users with `is_active = true` in `email_subscribers` table
**Function**: `sendBulkPrayerEmail()` / `sendApprovedUpdateNotification()`
**Use Cases**:
- New prayer request approved and published
- Prayer update approved and published

### Managing Recipients

1. **Admin Notifications**: Managed in AdminUserManagement component
   - By default, new admins have `receive_admin_emails = true`
   - Admins can toggle their preference using the checkmark icon
   - Query: `SELECT email FROM email_subscribers WHERE is_admin = true AND is_active = true AND receive_admin_emails = true`

2. **Subscriber Notifications**: Managed in EmailSubscribers component
   - Users opt-in by subscribing via the prayer app
   - Users can opt-out by toggling the green checkmark to gray X
   - Query: `SELECT email FROM email_subscribers WHERE is_active = true`
   - **Note**: This includes both regular subscribers AND admins (if they're also subscribers)

## Migration Instructions

### Apply Migration to Supabase

Run the migration SQL directly in Supabase SQL Editor:

```sql
-- Add receive_admin_emails column to email_subscribers table
ALTER TABLE email_subscribers 
ADD COLUMN IF NOT EXISTS receive_admin_emails BOOLEAN DEFAULT true;

-- Create index for efficient filtering of admins who want emails
CREATE INDEX IF NOT EXISTS idx_email_subscribers_receive_admin_emails 
ON email_subscribers(receive_admin_emails) 
WHERE is_admin = true AND receive_admin_emails = true;

-- Comment for documentation
COMMENT ON COLUMN email_subscribers.receive_admin_emails IS 'Whether this admin wants to receive admin notification emails (for prayer approvals, etc.)';
```

### Update Email Notification Code

**Admin notifications** now query from `email_subscribers`:

```typescript
const { data: admins } = await supabase
  .from('email_subscribers')
  .select('email')
  .eq('is_admin', true)
  .eq('is_active', true)
  .eq('receive_admin_emails', true);
```

**Subscriber notifications** query all active subscribers:

```typescript
const { data: subscribers } = await supabase
  .from('email_subscribers')
  .select('email')
  .eq('is_active', true);
```

## Testing Checklist

- [ ] Apply migration to Supabase
- [ ] Verify `receive_admin_emails` column exists in `email_subscribers` table
- [ ] Test toggling admin email preferences in AdminUserManagement
- [ ] Verify checkmark changes color (green ↔ gray)
- [ ] Verify summary count updates correctly
- [ ] Test that admins with `receive_admin_emails = false` don't receive notifications
- [ ] Verify Email Verification (2FA) settings still work correctly
- [ ] Verify no console errors in EmailSettings component

## Files Changed

1. `supabase/migrations/20251105000001_add_receive_admin_emails.sql` - NEW
2. `src/components/EmailSettings.tsx` - MODIFIED (removed distribution/reply-to settings)
3. `src/components/AdminUserManagement.tsx` - MODIFIED (added email toggle)
4. `src/lib/emailNotifications.ts` - MODIFIED (updated to use email_subscribers queries)

## Backwards Compatibility

- ✅ Migration uses `IF NOT EXISTS` - safe to run multiple times
- ✅ Default value of `true` means existing admins will continue receiving emails
- ✅ No breaking changes to existing functionality
