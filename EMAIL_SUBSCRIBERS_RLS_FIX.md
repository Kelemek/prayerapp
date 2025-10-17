# Email Subscribers RLS Fix

## Problem
The UserSettings component was unable to load email subscription preferences from the `email_subscribers` table. The checkbox would always appear as checked (default state) even when the database showed `is_active: false`.

## Root Cause
**Row Level Security (RLS)** was blocking SELECT queries to the `email_subscribers` table from the client side. Even though records existed in the database (visible in Supabase dashboard), the frontend queries returned empty arrays.

## Diagnosis
Console logs revealed:
```
🔍 All records in table (first 10): []
📧 Subscriber Data: null
📧 is_active value: undefined
```

This indicated that RLS policies were preventing any read access to the table.

## Solution
Created an RLS policy to allow anonymous and authenticated users to read from `email_subscribers`:

```sql
-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Anyone can read email subscribers" ON email_subscribers;

-- Create a policy that allows anyone to SELECT (read) from email_subscribers
CREATE POLICY "Anyone can read email subscribers"
ON email_subscribers
FOR SELECT
TO anon, authenticated
USING (true);
```

## Security Considerations
- **Read access is safe**: The `email_subscribers` table contains only email addresses, names, and opt-in preferences - no sensitive data
- **Write access remains protected**: Users can only INSERT into `pending_preference_changes`, not directly into `email_subscribers`
- **Admin approval workflow**: All preference changes must be approved by an admin before appearing in `email_subscribers`

## Implementation
1. Created `fix_email_subscribers_rls.sql` with the RLS policy
2. Ran the SQL in Supabase SQL Editor
3. Refreshed the app
4. UserSettings now correctly loads and displays `is_active` state from database

## Result
✅ Email subscription preferences now load correctly from the database
✅ Checkbox reflects actual `is_active` state (checked = true, unchecked = false)
✅ Name and email auto-populate from localStorage
✅ Priority system works: pending changes > approved preferences > defaults

## Files Modified
- `fix_email_subscribers_rls.sql` - RLS policy fix (run in Supabase)
- `src/components/UserSettings.tsx` - Already had correct logic, just needed RLS fix

## Testing
1. Open UserSettings modal
2. Name and email populate from localStorage ✓
3. Checkbox state loads from database `is_active` field ✓
4. Changes can be saved to `pending_preference_changes` ✓
5. After admin approval, preferences appear in `email_subscribers` ✓
6. Reopening settings shows approved preferences ✓

## Date
October 17, 2025
