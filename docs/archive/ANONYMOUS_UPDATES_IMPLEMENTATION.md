# Anonymous Updates Implementation

## Overview
Added the ability for users to post prayer updates anonymously, matching the functionality already available for prayer requests. The anonymous flag is now respected in email notifications.

## Changes Made

### 1. Database Migration
**File: `supabase/migrations/004_add_anonymous_to_updates.sql`**
- Added `is_anonymous` BOOLEAN column to `prayer_updates` table
- Default value: `false`
- Created index for faster lookups: `idx_prayer_updates_is_anonymous`

### 2. Database Types
**File: `src/lib/database.types.ts`**
- Added `is_anonymous: boolean` to `prayer_updates.Row`
- Added `is_anonymous?: boolean` to `prayer_updates.Insert`
- Added `is_anonymous?: boolean` to `prayer_updates.Update`

### 3. TypeScript Types
**File: `src/types/prayer.ts`**
- Added `is_anonymous?: boolean` to `PrayerUpdate` interface

### 4. Prayer Card Component
**File: `src/components/PrayerCard.tsx`**

#### State Management
- Added `updateIsAnonymous` state (boolean, default: false)
- Resets to false after update submission

#### Interface Update
- Updated `PrayerCardProps.onAddUpdate` signature:
  - Before: `(id: string, content: string, author: string, authorEmail: string) => void`
  - After: `(id: string, content: string, author: string, authorEmail: string, isAnonymous: boolean) => void`

#### Form UI
- Added checkbox below textarea in update form:
  ```tsx
  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
    <input
      type="checkbox"
      checked={updateIsAnonymous}
      onChange={(e) => setUpdateIsAnonymous(e.target.checked)}
      className="rounded border-gray-900 dark:border-white bg-white dark:bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500"
    />
    <span>Post update anonymously</span>
  </label>
  ```

#### Update Submission
- Modified `handleAddUpdate()` to pass `isAnonymous` flag
- Resets checkbox after submission

#### Display Logic
- Updates now check `is_anonymous` flag when displaying author:
  ```tsx
  {update.is_anonymous ? 'Anonymous' : update.author}
  ```

### 5. Prayer Manager Hook
**File: `src/hooks/usePrayerManager.ts`**

#### Function Signature
- Updated `addPrayerUpdate` to accept `isAnonymous` parameter:
  ```typescript
  const addPrayerUpdate = async (
    prayerId: string, 
    content: string, 
    author: string, 
    authorEmail?: string, 
    isAnonymous?: boolean
  )
  ```

#### Implementation
- When `isAnonymous` is true, stores "Anonymous" as author name
- Inserts `is_anonymous` flag into database
- Admin notification email uses correct author name (Anonymous or actual name)

### 6. Admin Approval Hook
**File: `src/hooks/useAdminData.ts`**

#### Email Notification Fix
- Updated `approveUpdate()` to check `is_anonymous` flag:
  ```typescript
  author: update.is_anonymous ? 'Anonymous' : (update.author || 'Anonymous')
  ```
- Ensures approved update emails show correct author based on privacy preference

## User Flow

### Submitting an Anonymous Update
1. User clicks "Add Update" on a prayer card
2. Fills in name, email, and update content
3. **Checks "Post update anonymously" checkbox**
4. Clicks "Add Update"
5. Update is submitted with `is_anonymous: true`
6. Author is stored as "Anonymous" in database
7. Admin receives notification showing "Anonymous" as author

### Submitting a Regular Update
1. User clicks "Add Update" on a prayer card
2. Fills in name, email, and update content
3. **Leaves checkbox unchecked**
4. Clicks "Add Update"
5. Update is submitted with `is_anonymous: false`
6. Author is stored as entered name
7. Admin receives notification showing actual author name

### Admin Approval Email
- When admin approves an update:
  - If `is_anonymous: true` → Email shows "Anonymous"
  - If `is_anonymous: false` → Email shows actual author name
- All users (or just admins, based on distribution setting) receive notification

### Display in Prayer Card
- Anonymous updates show "Anonymous" as author
- Regular updates show the actual author name
- Same display logic works for both pending and approved updates

## Database Schema
```sql
-- prayer_updates table structure
CREATE TABLE prayer_updates (
  id UUID PRIMARY KEY,
  prayer_id UUID REFERENCES prayers(id),
  content TEXT NOT NULL,
  author TEXT NOT NULL,  -- Stores "Anonymous" or actual name
  author_email TEXT NULL,
  is_anonymous BOOLEAN DEFAULT false,  -- NEW COLUMN
  approval_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Consistency with Prayer Requests
This implementation mirrors the anonymous functionality for prayer requests:
- **Prayer Requests**: Use `is_anonymous` boolean + `requester` field
- **Prayer Updates**: Use `is_anonymous` boolean + `author` field
- Both check the flag before displaying the name
- Both use the flag in email notifications
- Both have checkboxes in their forms with identical styling

## Migration Instructions

### Apply the Migration
```bash
# Option 1: Direct SQL
psql -U postgres -d your_database -f supabase/migrations/004_add_anonymous_to_updates.sql

# Option 2: Supabase CLI
supabase db push
```

### Testing Checklist
- ✅ Submit an anonymous update (checkbox checked)
- ✅ Submit a regular update (checkbox unchecked)
- ✅ Verify anonymous update shows "Anonymous" in card
- ✅ Verify regular update shows actual name in card
- ✅ Approve anonymous update as admin
- ✅ Check email shows "Anonymous" as author
- ✅ Approve regular update as admin
- ✅ Check email shows actual author name
- ✅ Verify checkbox resets after submission
- ✅ Verify checkbox styling matches prayer form

## Benefits
1. **User Privacy**: Users can now post updates without revealing identity
2. **Consistency**: Matches existing prayer request anonymous functionality
3. **Transparency**: Clear indication in database and UI when update is anonymous
4. **Email Accuracy**: Notifications respect user's privacy preference
5. **Flexibility**: Users can choose per-update whether to be anonymous

## Notes
- When `is_anonymous: true`, the `author` field still stores "Anonymous" for backward compatibility
- The `is_anonymous` flag is the source of truth for display logic
- Email notifications use the flag to determine what to show
- Existing updates without the flag will default to `false` (not anonymous)
- The checkbox matches the styling of the prayer request form checkbox (dark theme: white outline, light theme: black outline)
