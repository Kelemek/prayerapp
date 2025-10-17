# Notification Preference Approval System

## Overview
Implemented an approval workflow for user notification preference changes, similar to the existing prayer approval process. Users must now submit their preferences for admin review before they take effect.

## Database Changes

### New Table: `pending_preference_changes`
**Migration:** `20251016000001_create_pending_preference_changes.sql`

**Fields:**
- `id` - UUID primary key
- `name` - User's full name (TEXT, required)
- `email` - User's email address (TEXT, required)
- `receive_new_prayer_notifications` - Requested preference (BOOLEAN)
- `approval_status` - 'pending' | 'approved' | 'denied'
- `reviewed_by` - Admin who reviewed (UUID reference)
- `reviewed_at` - Timestamp of review
- `denial_reason` - Reason if denied (TEXT)
- `created_at` / `updated_at` - Timestamps

**Indexes:**
- `email` - Fast lookups
- `approval_status` - Filter pending items

**RLS Policies:**
- Anyone can INSERT (submit requests)
- Authenticated users can SELECT, UPDATE, DELETE (admin operations)

### Updated Table: `user_preferences`
- Added `name` field (TEXT, nullable)

## Frontend Changes

### UserSettings Component Updates

**New Features:**
1. **Name Field** - Added above email input
   - Required field for submission
   - Stored with preferences

2. **Approval Workflow** - Instead of direct save
   - Submits to `pending_preference_changes` table
   - Shows "Submit for Approval" button
   - Success message explains approval process

3. **Info Box Updated** - Now explains:
   - Changes require admin approval
   - User will be emailed when reviewed
   - What emails they'll always receive

**User Flow:**
1. Enter name and email
2. Click "Load" to see current preferences (if any)
3. Toggle notification preference
4. Click "Submit for Approval"
5. Await admin review
6. Receive email notification of approval/denial

### Admin Portal Updates

**New Tab:** "Preferences"
- Purple-themed (Mail icon)
- Shows count of pending preference changes
- Auto-selects if pending items exist

**New Component:** `PendingPreferenceChangeCard`
- Displays user name and email
- Shows requested preference (opt-in/opt-out)
- Approve/Deny buttons
- Denial reason textarea
- Date submitted

**Admin Actions:**
1. **Approve:**
   - Creates or updates `user_preferences` record
   - Marks request as 'approved'
   - Removes from pending list
   - TODO: Send approval email

2. **Deny:**
   - Requires denial reason
   - Marks request as 'denied'
   - Stores denial reason
   - Removes from pending list
   - TODO: Send denial email

## Workflow Diagram

```
User Submits Preference Change
         ↓
pending_preference_changes (status: pending)
         ↓
     Admin Reviews
         ↓
    Approve/Deny
         ↓
┌────────────────┬─────────────────┐
│    APPROVE     │      DENY       │
└────────────────┴─────────────────┘
         │                 │
         ↓                 ↓
Create/Update        Mark as denied
user_preferences     with reason
         │                 │
         ↓                 ↓
  Send approval      Send denial
      email             email
```

## Database Types Updated

Added to `database.types.ts`:
- `user_preferences.name` field
- `pending_preference_changes` table with full CRUD types

## Files Created/Modified

### Created:
1. `/supabase/migrations/20251016000001_create_pending_preference_changes.sql`
2. `/src/components/PendingPreferenceChangeCard.tsx`

### Modified:
1. `/src/components/UserSettings.tsx` - Added name field, approval workflow
2. `/src/components/AdminPortal.tsx` - Added preferences tab, approval functions
3. `/src/lib/database.types.ts` - Added new table types

## Security

- RLS policies ensure only authenticated users (admins) can approve/deny
- Anyone can submit preference changes (anonymous users)
- Validated email format on client side
- Required name field prevents anonymous submissions

## Next Steps (TODO)

1. **Email Notifications:**
   - Send approval email when preference change is approved
   - Send denial email with reason when denied
   - Use existing email notification system

2. **User Dashboard (Optional):**
   - Allow users to check status of their pending requests
   - Show approval/denial history

3. **Testing:**
   - Apply migration to Supabase
   - Test submission flow
   - Test admin approval/denial
   - Verify email notifications once implemented

## Benefits

✅ Prevents spam/abuse of notification system
✅ Admin oversight of who receives notifications
✅ Consistent approval workflow across all user actions
✅ Audit trail of all preference changes
✅ Ability to communicate with users via denial reasons
