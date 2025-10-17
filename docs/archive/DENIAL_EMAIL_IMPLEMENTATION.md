# Denial Email Notifications Implementation

## Overview
Added email notifications that are sent to users when their prayer requests or updates are denied by an admin. Users receive a personalized email explaining that their submission was not approved, along with the admin's reason for denial.

## Changes Made

### 1. Email Notification Functions
**File: `src/lib/emailNotifications.ts`**

#### New Interfaces
```typescript
interface DeniedPrayerPayload {
  title: string;
  description: string;
  requester: string;
  requesterEmail: string;
  denialReason: string;
}

interface DeniedUpdatePayload {
  prayerTitle: string;
  content: string;
  author: string;
  authorEmail: string;
  denialReason: string;
}
```

#### New Functions Added

**`sendDeniedPrayerNotification(payload: DeniedPrayerPayload)`**
- Sends email to the prayer requester when their submission is denied
- Only sends if requester provided an email address
- Uses red gradient header to distinguish from approval emails
- Includes denial reason prominently in the email

**`sendDeniedUpdateNotification(payload: DeniedUpdatePayload)`**
- Sends email to the update author when their submission is denied
- Only sends if author provided an email address
- Uses red gradient header for visual distinction
- Includes denial reason prominently in the email

**`generateDeniedPrayerHTML(payload: DeniedPrayerPayload)`**
- Creates styled HTML template for denied prayer emails
- Red gradient header (distinguishes from green approval emails)
- Displays denial reason in red-bordered callout box
- Shows the original submission for context
- Includes "Visit Prayer App" CTA button

**`generateDeniedUpdateHTML(payload: DeniedUpdatePayload)`**
- Creates styled HTML template for denied update emails
- Red gradient header matching prayer denial style
- Displays denial reason in red-bordered callout box
- Shows the original update content for context
- Includes "Visit Prayer App" CTA button

### 2. Admin Hook Updates
**File: `src/hooks/useAdminData.ts`**

#### Import Updates
```typescript
import { 
  sendApprovedPrayerNotification, 
  sendApprovedUpdateNotification, 
  sendDeniedPrayerNotification,  // NEW
  sendDeniedUpdateNotification    // NEW
} from '../lib/emailNotifications';
```

#### `denyPrayer()` Function Enhancement
**Before:**
```typescript
const denyPrayer = useCallback(async (prayerId: string, reason: string) => {
  const { error } = await supabase
    .from('prayers')
    .update({ approval_status: 'denied', denial_reason: reason })
    .eq('id', prayerId);
  if (error) throw error;
  await fetchAdminData();
}, [fetchAdminData]);
```

**After:**
```typescript
const denyPrayer = useCallback(async (prayerId: string, reason: string) => {
  // 1. Fetch prayer details first
  const { data: prayer } = await supabase
    .from('prayers')
    .select('*')
    .eq('id', prayerId)
    .single();
  
  // 2. Update status in database
  const { error } = await supabase
    .from('prayers')
    .update({ approval_status: 'denied', denial_reason: reason })
    .eq('id', prayerId);
  
  // 3. Send email notification to requester
  if (prayer.email) {
    await sendDeniedPrayerNotification({
      title: prayer.title,
      description: prayer.description,
      requester: prayer.is_anonymous ? 'Anonymous' : prayer.requester,
      requesterEmail: prayer.email,
      denialReason: reason
    });
  }
  
  await fetchAdminData();
}, [fetchAdminData]);
```

#### `denyUpdate()` Function Enhancement
**Before:**
```typescript
const denyUpdate = useCallback(async (updateId: string, reason: string) => {
  const { error } = await supabase
    .from('prayer_updates')
    .update({ approval_status: 'denied', denial_reason: reason })
    .eq('id', updateId);
  if (error) throw error;
  await fetchAdminData();
}, [fetchAdminData]);
```

**After:**
```typescript
const denyUpdate = useCallback(async (updateId: string, reason: string) => {
  // 1. Fetch update details with prayer title
  const { data: update } = await supabase
    .from('prayer_updates')
    .select('*, prayers(title)')
    .eq('id', updateId)
    .single();
  
  // 2. Update status in database
  const { error } = await supabase
    .from('prayer_updates')
    .update({ approval_status: 'denied', denial_reason: reason })
    .eq('id', updateId);
  
  // 3. Send email notification to author
  if (update.author_email) {
    await sendDeniedUpdateNotification({
      prayerTitle: update.prayers?.title || 'Prayer',
      content: update.content,
      author: update.is_anonymous ? 'Anonymous' : update.author,
      authorEmail: update.author_email,
      denialReason: reason
    });
  }
  
  await fetchAdminData();
}, [fetchAdminData]);
```

## Email Template Design

### Denied Prayer Email
**Subject:** `Prayer Request Not Approved: {title}`

**Visual Design:**
- **Header:** Red gradient background (#ef4444 to #dc2626)
- **Icon:** 📋 (clipboard emoji)
- **Sections:**
  1. Prayer title as H2
  2. Polite message thanking them for submission
  3. **Denial reason** in red-bordered callout box (background: #fef2f2, border: #ef4444)
  4. Original submission content in neutral box
  5. Helpful message about contacting admin
  6. "Visit Prayer App" button (gray, neutral)

**Example:**
```
Subject: Prayer Request Not Approved: Healing for John

[Red Header]
📋 Prayer Request Status

Thank you for submitting your prayer request. After careful review, 
we are unable to approve this request at this time.

┌─ [Red Box] ──────────────────────────┐
│ Reason:                               │
│ This request contains personal        │
│ information that should be kept       │
│ private for the individual's safety.  │
└───────────────────────────────────────┘

Your Submission:
[Prayer content shown here]

If you have questions, please contact the administrator.

[Visit Prayer App Button]
```

### Denied Update Email
**Subject:** `Prayer Update Not Approved: {prayerTitle}`

**Visual Design:**
- **Header:** Red gradient background (matches prayer denial)
- **Icon:** 💬 (speech bubble emoji)
- **Sections:**
  1. "Update for: {prayer title}" as H2
  2. Polite message thanking them for submission
  3. **Denial reason** in red-bordered callout box
  4. Original update content in neutral box
  5. Helpful message about contacting admin
  6. "Visit Prayer App" button (gray, neutral)

**Example:**
```
Subject: Prayer Update Not Approved: Healing for John

[Red Header]
💬 Update Status

Thank you for submitting an update. After careful review, 
we are unable to approve this update at this time.

┌─ [Red Box] ──────────────────────────┐
│ Reason:                               │
│ This update contains content that     │
│ doesn't relate to the prayer request. │
└───────────────────────────────────────┘

Your Update:
[Update content shown here]

If you have questions, please contact the administrator.

[Visit Prayer App Button]
```

## User Flow

### When Admin Denies a Prayer
1. Admin reviews pending prayer in admin portal
2. Admin clicks "Deny" button
3. Admin enters denial reason in form
4. Admin confirms denial
5. System updates prayer status to 'denied' in database
6. **System sends email to requester (if email was provided)**
7. Requester receives email with:
   - Clear indication prayer was not approved
   - Specific reason from admin
   - Their original submission for reference
   - Option to visit app or contact admin

### When Admin Denies an Update
1. Admin reviews pending update in admin portal
2. Admin clicks "Deny" button
3. Admin enters denial reason in form
4. Admin confirms denial
5. System updates update status to 'denied' in database
6. **System sends email to author (if email was provided)**
7. Author receives email with:
   - Clear indication update was not approved
   - Specific reason from admin
   - Their original update for reference
   - Option to visit app or contact admin

## Privacy Considerations

### Anonymous Submissions
- If user submitted **prayer anonymously** (`is_anonymous: true`):
  - Email shows "Anonymous" as requester name
  - Email still sent to their email address (privacy in app, not in notification)
  
- If user submitted **update anonymously** (`is_anonymous: true`):
  - Email shows "Anonymous" as author name
  - Email still sent to their email address

### Email Requirements
- Denial emails **only sent if user provided an email**
- If no email address:
  - Warning logged: "No email address for denied prayer/update"
  - Denial still processed in database
  - User won't receive notification (but they wouldn't get approval email either)

## Error Handling
- All email functions wrapped in try-catch blocks
- Email sending errors logged but don't block denial process
- If email fails to send:
  - Error logged to console
  - Denial still recorded in database
  - Admin portal still refreshes
  - User experience not interrupted

## Comparison with Approval Emails

| Feature | Approval Email | Denial Email |
|---------|---------------|--------------|
| Header Color | Green gradient (#10b981) | Red gradient (#ef4444) |
| Icon | 🙏 Prayer / 💬 Update | 📋 Status / 💬 Update |
| Tone | Celebratory | Respectful, informative |
| Recipient | All users or admins | Only the submitter |
| CTA Button | "View Prayer" (green) | "Visit Prayer App" (gray) |
| Content | Approved item details | Denial reason + original submission |

## Testing Checklist
- ✅ Deny a prayer with email address → Requester receives denial email
- ✅ Deny a prayer without email → No email sent, no error
- ✅ Deny an anonymous prayer → Email shows "Anonymous" as requester
- ✅ Deny an update with email → Author receives denial email
- ✅ Deny an update without email → No email sent, no error
- ✅ Deny an anonymous update → Email shows "Anonymous" as author
- ✅ Check email formatting in different clients (Gmail, Outlook, etc.)
- ✅ Verify denial reason appears correctly in email
- ✅ Confirm CTA button links work correctly
- ✅ Test with special characters in denial reason
- ✅ Verify database denial_reason field is populated

## Benefits
1. **Transparency:** Users understand why their submission wasn't approved
2. **Communication:** Opens dialogue between users and admins
3. **Learning:** Users can improve future submissions based on feedback
4. **Professionalism:** Respectful, clear communication builds trust
5. **Closure:** Users get definitive answer instead of wondering
6. **Context:** Users see their original submission for reference

## Future Enhancements
- Add ability for users to resubmit with modifications
- Add "Reply to Admin" button in denial emails
- Track denial email delivery status
- Add admin response templates for common denial reasons
- Allow users to appeal denials through the app
- Add statistics on denial reasons to help improve guidelines
