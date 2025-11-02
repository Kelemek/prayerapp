# Admin User Management Implementation

## Overview
A comprehensive admin user management module has been added to the admin settings. This allows existing admins to:
- View all current admin users
- Add new admin users
- Remove admin access from existing users
- Send automated invitation emails to new admins

## Features

### Admin List
- Displays all users with admin privileges
- Shows name, email, creation date, and last sign-in date
- Clean card-based UI with admin shield icons

### Add New Admin
- Form to add admin by name and email
- Email validation
- Duplicate prevention (won't add existing admins)
- Automatically sends invitation email with:
  - Welcome message
  - Instructions for accessing admin portal
  - Link to admin login page
  - Explanation of magic link authentication

### Remove Admin
- Delete button for each admin user
- Confirmation dialog to prevent accidental deletion
- Protection: Cannot delete the last admin user
- Removes admin privileges (sets `is_admin = false`)

### Last Sign-In Tracking
- Automatically tracks when admins sign in
- Updates `last_sign_in_at` timestamp via database function
- Displayed in admin list for activity monitoring

## Database Changes

### Migration: `20251102000001_add_admin_tracking.sql`

**New Column:**
- `last_sign_in_at` - TIMESTAMP WITH TIME ZONE (nullable)
  - Tracks the last time an admin signed in
  - Updated automatically via `update_admin_last_sign_in()` function

**New Index:**
- `idx_email_subscribers_admin` - Index on `is_admin` column for fast admin lookups

**New Function:**
- `update_admin_last_sign_in(admin_email TEXT)`
  - Security definer function
  - Updates last_sign_in_at for the specified admin email
  - Called automatically when admin signs in via magic link
  - Grants to authenticated and anon roles

## Implementation Details

### Component: `AdminUserManagement.tsx`
- **Location**: `src/components/AdminUserManagement.tsx`
- **State Management**:
  - Loads admins from `email_subscribers` table where `is_admin = true`
  - Form state for adding new admins
  - Delete confirmation state
  - Success/error message handling

### Integration
- Added to `AdminPortal.tsx` in the Settings tab
- Positioned after EmailSubscribers, before SyncMailchimpSubscribers
- Uses same styling as other admin modules

### Authentication Hook Update
- Updated `useAdminAuth.tsx` to call `update_admin_last_sign_in()` RPC
- Triggers on `SIGNED_IN` event from Supabase auth
- Gracefully handles errors without blocking sign-in

## Invitation Email

When a new admin is added, they receive an email with:

**Subject**: "Admin Access Granted - Prayer App"

**Content**:
- Welcome message with their name
- List of admin capabilities:
  - Review and approve prayer requests
  - Manage prayer updates and deletions
  - Configure email settings and subscribers
  - Manage prayer prompts and types
  - Access the full admin portal
- Step-by-step sign-in instructions:
  1. Go to admin login page
  2. Enter email address
  3. Click "Send Magic Link"
  4. Check email for secure sign-in link
- Button link to admin portal
- Explanation of passwordless authentication

**Email Service**: Uses `send-notification` Edge Function with Resend API

## Setup Instructions

### 1. Apply Database Migration

Run the migration in Supabase SQL Editor:

```sql
-- Copy and paste the contents of:
supabase/migrations/20251102000001_add_admin_tracking.sql
```

Or use Supabase CLI (if linked):
```bash
npx supabase db push
```

### 2. Verify Function Deployment

Ensure the `send-notification` Edge Function is deployed:

```bash
cd supabase/functions/send-notification
supabase functions deploy send-notification
```

### 3. Test the Feature

1. Sign in to admin portal
2. Go to Settings tab
3. Scroll to "Admin User Management" section
4. Click "Add Admin"
5. Enter name and email
6. Click "Add & Send Invitation"
7. Verify:
   - Admin appears in the list
   - Invitation email is received
   - New admin can sign in with magic link

## Security Considerations

1. **RLS Policies**: Admin data is protected by existing RLS policies on `email_subscribers`
2. **Last Admin Protection**: Cannot delete the last admin user
3. **Email Verification**: Uses existing verified Resend domain
4. **Magic Link Auth**: All admins use passwordless authentication
5. **Inactivity Timeout**: Existing 30-minute timeout still applies

## Error Handling

- **Duplicate Admin**: Shows error if email is already an admin
- **Invalid Email**: Validates email format before submission
- **Email Send Failure**: Warns in console but doesn't fail admin creation
- **Database Errors**: Shows user-friendly error messages
- **Loading States**: Shows spinners during operations

## UI/UX Features

- **Responsive Design**: Works on mobile and desktop
- **Dark Mode Support**: Full dark mode compatibility
- **Icons**: Shield icon for admin branding, UserPlus for add, Trash2 for delete
- **Success Messages**: Green notification with dismissible close button
- **Error Messages**: Red notification with details
- **Confirmation Dialogs**: Prevents accidental deletions
- **Loading Indicators**: Shows spinners during async operations
- **Empty State**: Helpful message when no admins exist

## Future Enhancements

Potential improvements:
- Role-based permissions (super admin, moderator, etc.)
- Admin activity log
- Bulk admin operations
- Email notification preferences for admins
- Admin invitation expiry
- Two-factor authentication option

## Files Changed

1. **New Files**:
   - `src/components/AdminUserManagement.tsx` (404 lines)
   - `supabase/migrations/20251102000001_add_admin_tracking.sql`
   - `docs/ADMIN_USER_MANAGEMENT.md` (this file)

2. **Modified Files**:
   - `src/components/AdminPortal.tsx` - Added import and component
   - `src/hooks/useAdminAuth.tsx` - Added last sign-in tracking

## Testing Checklist

- [ ] Add new admin successfully
- [ ] Invitation email received
- [ ] New admin can sign in
- [ ] Last sign-in date updates
- [ ] Delete admin works
- [ ] Cannot delete last admin
- [ ] Duplicate email prevention
- [ ] Email validation works
- [ ] Success/error messages display
- [ ] Dark mode looks correct
- [ ] Mobile responsive
- [ ] Loading states work
