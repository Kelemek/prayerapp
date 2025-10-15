# Status Change Email Notifications Implementation

## Overview
Added email notifications for status change request approvals and denials, similar to the existing prayer and update notification system.

## What Was Implemented

### 1. Email Notification Functions (`src/lib/emailNotifications.ts`)

#### New Interfaces
```typescript
interface ApprovedStatusChangePayload {
  prayerTitle: string;
  requestedBy: string;
  requestedEmail: string;
  currentStatus: string;
  newStatus: string;
  reason?: string;
}

interface DeniedStatusChangePayload {
  prayerTitle: string;
  requestedBy: string;
  requestedEmail: string;
  requestedStatus: string;
  currentStatus: string;
  reason?: string;
  denialReason: string;
}
```

#### New Functions
- **`sendApprovedStatusChangeNotification()`** - Sends approval confirmation to requester
- **`sendDeniedStatusChangeNotification()`** - Sends denial notification to requester
- **`generateApprovedStatusChangeHTML()`** - Creates styled HTML for approval email
- **`generateDeniedStatusChangeHTML()`** - Creates styled HTML for denial email

### 2. Email Templates

#### Approval Email
- **Subject**: "Status Change Approved: [Prayer Title]"
- **Style**: Green gradient header with ✅ icon
- **Content**:
  - Prayer title
  - Previous status → New status (highlighted)
  - Requester's optional note/reason
  - Thank you message
  - "View Prayer" button linking to app

#### Denial Email
- **Subject**: "Status Change Not Approved: [Prayer Title]"
- **Style**: Red gradient header with 📋 icon
- **Content**:
  - Prayer title
  - Requested status and current status
  - Requester's optional note/reason
  - Admin's denial reason (highlighted in red)
  - Contact information
  - "Visit Prayer App" button

### 3. Admin Hook Updates (`src/hooks/useAdminData.ts`)

#### Updated `approveStatusChangeRequest()`
- Now fetches complete status change request with prayer details
- Retrieves current prayer status before updating
- Sends approval email to requester with:
  - Prayer title
  - Previous status (before change)
  - New status (after change)
  - Requester's original reason/note
- Only sends email if `requested_email` is provided

#### Updated `denyStatusChangeRequest()`
- Now fetches complete status change request with prayer details
- Sends denial email to requester with:
  - Prayer title
  - Requested status (what they wanted)
  - Current status (unchanged)
  - Requester's original reason/note
  - Admin's denial reason
- Only sends email if `requested_email` is provided

## User Experience

### For Prayer Requesters

**When Status Change is Approved:**
1. Submits status change request through the app
2. Receives professional email confirmation
3. Sees clear before/after status information
4. Can click to view updated prayer

**When Status Change is Denied:**
1. Receives email explaining the denial
2. Sees admin's reason for denial
3. Knows current status remains unchanged
4. Has option to contact admin with questions

### For Administrators

**No UI Changes Required:**
- Emails are sent automatically when clicking "Approve" or "Deny"
- Uses existing admin portal workflow
- No additional configuration needed
- Works with existing email infrastructure

## Technical Details

### Database Fields Used
- `status_change_requests.requested_email` - Recipient email
- `status_change_requests.requested_by` - Requester name
- `status_change_requests.requested_status` - Desired status
- `status_change_requests.reason` - Requester's note
- `status_change_requests.denial_reason` - Admin's reason (denials only)
- `prayers.title` - Prayer title
- `prayers.status` - Current prayer status

### Email Delivery
- Uses existing Supabase Edge Function (`send-notification`)
- Sends individual emails (not broadcast)
- HTML templates with responsive design
- Plain text fallback included

### Error Handling
- Logs warnings if email address is missing
- Continues processing even if email fails
- Console logs for debugging
- Doesn't block status change approval/denial

## Testing Checklist

- [ ] Approve status change - verify email sent
- [ ] Approve status change without email - verify no error
- [ ] Deny status change - verify email with denial reason
- [ ] Deny status change without email - verify no error
- [ ] Check HTML formatting in various email clients
- [ ] Verify "View Prayer" links work correctly
- [ ] Test with different status transitions (current→ongoing, etc.)

## Related Files

- `src/lib/emailNotifications.ts` - Email notification functions
- `src/hooks/useAdminData.ts` - Admin data management
- `src/lib/database.types.ts` - Database type definitions
- `supabase/functions/send-notification/index.ts` - Email delivery function

## Future Enhancements

Potential improvements:
- Add email preference settings for requesters
- Include prayer description in emails
- Add "Reply to Admin" functionality
- Track email delivery status
- Add email templates for different status transitions

## Notes

- Email addresses are optional; system works without them
- Follows same pattern as prayer/update notifications
- Green theme for approvals, red theme for denials
- Respects existing email infrastructure and settings
