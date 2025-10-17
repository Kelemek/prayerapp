# Quick Test: Verify Approval is Working

## Test Scenario

You approved a preference but don't see it updating `email_subscribers`.

## Step-by-Step Test

### 1. Note the Email Address
When you submit from main site settings, note the email address.
Let's say it's: `test@example.com`

### 2. Before Approval - Check Current State
Run in Supabase SQL Editor:
```sql
-- Check if user already exists in email_subscribers
SELECT * FROM email_subscribers WHERE email = 'test@example.com';
```

**Results:**
- **If row exists:** Note the current `is_active` and `updated_at` values
- **If no rows:** User will be inserted when you approve

### 3. Check Pending Request
```sql
-- See the pending request
SELECT 
  id,
  email,
  name,
  receive_new_prayer_notifications,
  approval_status,
  created_at
FROM pending_preference_changes
WHERE email = 'test@example.com'
  AND approval_status = 'pending'
ORDER BY created_at DESC
LIMIT 1;
```

Should show the pending request.

### 4. Open Browser Console
- F12 or right-click → Inspect
- Go to Console tab
- Clear console (click 🚫 or press Ctrl+L)

### 5. Approve in Admin Portal
- Admin Portal → Preferences tab
- Click "Approve"

### 6. Watch Console Output
You should see:
```
🔄 Starting approval for preference change: [uuid]
📋 Preference change details: {email: "test@example.com", ...}
🔍 Existing subscriber: Found (or Not found)
✅ Updated existing subscriber: test@example.com
   (or ✅ Added new subscriber: test@example.com)
✅ Preference change approved successfully!
📧 Check email_subscribers table for: test@example.com
```

**If you see errors instead:**
- Copy the full error message
- Check which step failed

### 7. After Approval - Verify Database
Run immediately after approval:
```sql
-- Check if subscriber was updated/inserted
SELECT 
  email,
  name,
  is_active,
  is_admin,
  updated_at
FROM email_subscribers
WHERE email = 'test@example.com';
```

**Expected:**
- Row exists ✅
- `is_active` matches what user requested (true/false)
- `is_admin` = false
- `updated_at` is within last minute

### 8. Check Pending Status
```sql
-- Verify request was marked approved
SELECT 
  approval_status,
  reviewed_at
FROM pending_preference_changes
WHERE email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- `approval_status` = 'approved'
- `reviewed_at` has timestamp

### 9. Check Email Settings Tab
- Go to Admin Portal → Email Settings
- Look for `test@example.com`
- Should be in the list with:
  - Name displayed
  - Active/Inactive status (green check or red X)

**If not visible:**
- Click the refresh button (🔄) in Email Settings
- Or close and reopen Admin Portal

---

## Quick Verification Query

Run this all-in-one check:
```sql
WITH latest_pending AS (
  SELECT * FROM pending_preference_changes
  WHERE approval_status = 'approved'
  ORDER BY reviewed_at DESC
  LIMIT 1
),
matching_subscriber AS (
  SELECT * FROM email_subscribers
  WHERE email = (SELECT email FROM latest_pending)
)
SELECT 
  'Pending Request' as source,
  lp.email,
  lp.name as pending_name,
  lp.receive_new_prayer_notifications as pending_pref,
  lp.approval_status,
  NULL::boolean as sub_is_active,
  NULL::boolean as sub_is_admin,
  lp.reviewed_at
FROM latest_pending lp
UNION ALL
SELECT 
  'Email Subscriber' as source,
  ms.email,
  ms.name as pending_name,
  NULL::boolean as pending_pref,
  NULL::text as approval_status,
  ms.is_active as sub_is_active,
  ms.is_admin as sub_is_admin,
  ms.updated_at as reviewed_at
FROM matching_subscriber ms;
```

This shows both the approved request and the matching subscriber side-by-side.

---

## What to Share

If still not working, share:
1. ✅ Console output (copy/paste or screenshot)
2. ✅ Result of Step 7 query (email_subscribers check)
3. ✅ Result of Step 8 query (approval status)
4. ✅ Any error messages from console
