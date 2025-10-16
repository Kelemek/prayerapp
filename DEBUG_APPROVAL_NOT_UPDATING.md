# Debugging: Main Site Settings Not Updating email_subscribers

## Issue
Admin approval from main site settings is not updating the `email_subscribers` table.

## Diagnostic Steps

### Step 1: Check if Migration Was Applied

Run this in Supabase SQL Editor:

```sql
-- Check if is_admin column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'email_subscribers'
ORDER BY ordinal_position;
```

**Expected Result:**
```
column_name  | data_type | is_nullable
-------------|-----------|------------
id           | uuid      | NO
name         | text      | NO
email        | text      | NO
is_active    | boolean   | YES
created_at   | timestamp | YES
updated_at   | timestamp | YES
is_admin     | boolean   | YES  ← Should be here!
```

**If `is_admin` is missing:**
- Migration hasn't been applied yet
- Go to Supabase Dashboard → SQL Editor
- Copy/paste contents of `supabase/migrations/20251016000002_consolidate_to_email_subscribers.sql`
- Click Run

---

### Step 2: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Submit a preference change from main site
4. Go to Admin Portal → Preferences
5. Click "Approve"

**Look for these logs:**
- `🔄 Starting approval for preference change: [id]`
- `📋 Preference change details: [object]`
- `🔍 Existing subscriber: Found/Not found`
- `✅ Updated existing subscriber: [email]` OR `✅ Added new subscriber: [email]`

**If you see errors:**
- ❌ `Error updating subscriber` - Check error message
- ❌ `column "is_admin" does not exist` - Migration not applied!
- ❌ `permission denied` - RLS policy issue

---

### Step 3: Check RLS Policies

The code requires authenticated (admin) users to update `email_subscribers`:

```sql
-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'email_subscribers';
```

**Required policies:**
- `Authenticated users can update email subscribers` (UPDATE)
- `Authenticated users can insert email subscribers` (INSERT)

**If policies are missing or wrong:**
```sql
-- Grant admin users permission to update/insert
DROP POLICY IF EXISTS "Authenticated users can update email subscribers" ON email_subscribers;
DROP POLICY IF EXISTS "Authenticated users can insert email subscribers" ON email_subscribers;

CREATE POLICY "Authenticated users can update email subscribers"
  ON email_subscribers
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert email subscribers"
  ON email_subscribers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

---

### Step 4: Verify Data Flow

**Check pending_preference_changes:**
```sql
-- See if preference changes are being submitted
SELECT * FROM pending_preference_changes
ORDER BY created_at DESC
LIMIT 5;
```

Should show recent submissions with `approval_status = 'pending'`.

**Check email_subscribers after approval:**
```sql
-- Check if subscriber was added/updated
SELECT email, name, is_active, is_admin, updated_at
FROM email_subscribers
WHERE email = '[USER_EMAIL_HERE]'  -- Replace with test email
ORDER BY updated_at DESC;
```

Should show:
- Record exists
- `is_active` matches the preference
- `is_admin` = false
- `updated_at` is recent

---

### Step 5: Manual Test

Try updating directly in SQL to rule out code issues:

```sql
-- Test insert
INSERT INTO email_subscribers (email, name, is_active, is_admin)
VALUES ('test@example.com', 'Test User', true, false)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    is_admin = EXCLUDED.is_admin,
    updated_at = NOW();
```

**If this fails:**
- Column doesn't exist → Run migration
- Permission denied → Fix RLS policies
- Other error → Check error message

**If this succeeds:**
- Problem is in the JavaScript code
- Check console logs when approving

---

## Common Issues & Solutions

### Issue 1: Column "is_admin" does not exist
**Cause:** Migration not applied  
**Solution:** Run the migration SQL in Supabase Dashboard

### Issue 2: Permission denied for table email_subscribers
**Cause:** RLS policies don't allow authenticated users to update  
**Solution:** Check/fix RLS policies (see Step 3)

### Issue 3: Approval succeeds but table not updated
**Cause:** Silent error or wrong table being updated  
**Solution:** Check console logs with new debug logging

### Issue 4: "Updated existing subscriber" but data unchanged
**Cause:** Update query not matching any rows  
**Solution:** Check email match (case sensitivity, whitespace)

---

## Quick Verification Script

Run this after clicking approve:

```sql
-- Check the approval chain
WITH latest_approval AS (
  SELECT * FROM pending_preference_changes
  WHERE approval_status = 'approved'
  ORDER BY reviewed_at DESC
  LIMIT 1
)
SELECT 
  'Pending Change' as source,
  la.email,
  la.name,
  la.receive_new_prayer_notifications as preference
FROM latest_approval la
UNION ALL
SELECT 
  'Email Subscriber' as source,
  es.email,
  es.name,
  es.is_active as preference
FROM latest_approval la
JOIN email_subscribers es ON es.email = la.email;
```

Should show 2 rows with matching data.

---

## Next Steps

1. ✅ Check if migration applied (Step 1)
2. ✅ Open console and test approval (Step 2)
3. ✅ Share console logs/errors
4. ✅ Check RLS policies if needed (Step 3)

**Most Likely Issue:**
The `is_admin` column doesn't exist yet because the migration hasn't been applied to your database.
