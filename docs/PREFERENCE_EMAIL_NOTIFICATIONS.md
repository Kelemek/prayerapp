# Notification Preference Change Email System

## Overview
Implemented a complete email notification system for the user notification preference approval workflow, matching the existing patterns used for prayer updates, deletions, and status changes.

## Email Flow

### 1. User Submits Preference Change
**Trigger:** User clicks "Submit for Approval" in Settings modal
**Recipients:** All active admin email subscribers
**Email Type:** Admin notification

**Content:**
- User's name and email
- Requested preference (Opt IN or Opt OUT)
- Description of what the preference means
- Link to Admin Portal to review

**Implementation:**
- Function: `sendPreferenceChangeNotification()` in `src/lib/emailNotifications.ts`
- Called from: `UserSettings.tsx` after inserting into `pending_preference_changes` table
- Fetches admin emails from `email_subscribers` table where `is_active = true`

### 2. Admin Approves Preference Change
**Trigger:** Admin clicks "Approve" button in Admin Portal → Preferences tab
**Recipients:** The user who submitted the request
**Email Type:** Approval confirmation

**Content:**
- Personalized greeting with user's name
- Confirmation of approval
- Clear explanation of what the preference means:
  - **Opt IN:** "You will now receive email notifications when new prayers are posted"
  - **Opt OUT:** "You will no longer receive new prayer notifications (but still get approval/denial emails for your submissions)"
- Link to visit prayer app
- Thank you message

**Implementation:**
- Function: `sendApprovedPreferenceChangeNotification()` in `src/lib/emailNotifications.ts`
- Called from: `AdminPortal.tsx` in `approvePreferenceChange()` function
- Sent after updating `user_preferences` table and marking request as approved

### 3. Admin Denies Preference Change
**Trigger:** Admin clicks "Deny" button and enters reason in Admin Portal → Preferences tab
**Recipients:** The user who submitted the request
**Email Type:** Denial notification

**Content:**
- Personalized greeting with user's name
- Explanation that the request was reviewed and denied
- Display of requested preference
- Admin's denial reason
- Encouragement to contact admin with questions
- Link to visit prayer app

**Implementation:**
- Function: `sendDeniedPreferenceChangeNotification()` in `src/lib/emailNotifications.ts`
- Called from: `AdminPortal.tsx` in `denyPreferenceChange()` function
- Sent after marking request as denied with reason

## Files Modified

### 1. src/lib/emailNotifications.ts
**Added:**
- `PreferenceChangeNotificationPayload` interface
- `ApprovedPreferenceChangePayload` interface
- `DeniedPreferenceChangePayload` interface
- `sendPreferenceChangeNotification()` - Notifies admins of new request
- `sendApprovedPreferenceChangeNotification()` - Confirms approval to user
- `sendDeniedPreferenceChangeNotification()` - Explains denial to user
- `generatePreferenceChangeNotificationHTML()` - Purple-themed admin email
- `generateApprovedPreferenceChangeHTML()` - Green-themed approval email
- `generateDeniedPreferenceChangeHTML()` - Red-themed denial email

### 2. src/components/UserSettings.tsx
**Added:**
- Import: `sendPreferenceChangeNotification`
- Call to `sendPreferenceChangeNotification()` after successfully inserting preference change

**Purpose:** Notifies admins immediately when a user submits a preference change

### 3. src/components/AdminPortal.tsx
**Added:**
- Import: `sendApprovedPreferenceChangeNotification, sendDeniedPreferenceChangeNotification`
- Updated `approvePreferenceChange()`:
  - Fetches preference change details before approving
  - Calls `sendApprovedPreferenceChangeNotification()` after approval
  - Removed TODO comment
- Updated `denyPreferenceChange()`:
  - Fetches preference change details before denying
  - Calls `sendDeniedPreferenceChangeNotification()` after denial
  - Removed TODO comment

**Purpose:** Notifies users of approval/denial decisions

## Email Design

### Admin Notification Email (Purple Theme)
- **Header:** Purple gradient with 📧 emoji
- **Sections:**
  - User information card (white background)
  - Preference request highlight (green for opt-in, orange for opt-out)
  - Action button: "Review in Admin Portal"
- **Footer:** Standard automated notification disclaimer

### Approval Email (Green Theme)
- **Header:** Green gradient with ✅ emoji
- **Sections:**
  - Personalized greeting
  - Success message with green checkmark
  - Highlighted preference explanation (green background)
  - Usage instructions
  - Action button: "Visit Prayer App"
  - Thank you message with 🙏 emoji
- **Footer:** Standard automated notification disclaimer

### Denial Email (Red Theme)
- **Header:** Red gradient with 📋 emoji
- **Sections:**
  - Personalized greeting
  - Polite explanation of denial
  - Requested preference details (white card)
  - Denial reason (red-bordered box)
  - Invitation to contact admin
  - Action button: "Visit Prayer App"
- **Footer:** Standard automated notification disclaimer

## Email Delivery

All emails are sent via the Supabase Edge Function `send-notification` which handles:
- Sending to single or multiple recipients
- HTML and plain text versions
- Error handling and logging
- Integration with email service (SendGrid, Resend, etc.)

## Consistency with Existing Patterns

This implementation follows the exact same patterns as:
- Prayer approval/denial emails
- Update approval/denial emails
- Deletion request emails
- Status change request emails

**Common elements:**
- Same email service infrastructure
- Similar HTML template structure
- Consistent error handling
- Admin notification → User notification flow
- Color-coded by action type (purple for requests, green for approval, red for denial)

## Testing Checklist

- [ ] User submits opt-IN preference → Admin receives notification
- [ ] User submits opt-OUT preference → Admin receives notification
- [ ] Admin approves opt-IN → User receives green approval email
- [ ] Admin approves opt-OUT → User receives green approval email
- [ ] Admin denies request → User receives red denial email with reason
- [ ] Verify HTML rendering in various email clients
- [ ] Confirm links work correctly (Admin Portal, Visit Prayer App)
- [ ] Test with missing/invalid email addresses
- [ ] Verify email_subscribers table is checked for active admins

## Future Enhancements

1. **Email Templates:** Move HTML templates to separate files or database
2. **Customization:** Allow admin to customize email content
3. **Batch Processing:** Handle multiple preference changes in one email
4. **Email Preferences:** Let users choose which types of notifications they want
5. **Reminder Emails:** Send reminders for pending preference changes
6. **Activity Log:** Track all email notifications sent

## Dependencies

- Supabase client (`src/lib/supabase.ts`)
- Edge Function: `send-notification` (must be deployed to Supabase)
- Database tables:
  - `email_subscribers` (for admin emails)
  - `pending_preference_changes` (for request tracking)
  - `user_preferences` (for approved preferences)

## Notes

- Emails are sent asynchronously and won't block the UI
- Errors in email sending are logged but don't prevent the approval/denial action
- Admin notification is sent immediately when user submits (not after admin approval)
- User only receives one email: either approval or denial
- All email addresses are converted to lowercase for consistency
