# Troubleshooting: "Failed to send reminders" Error

## Common Causes & Solutions

### 1. **Database Migration Not Applied** ⚠️ MOST COMMON
**Problem:** The `reminder_interval_days` and `last_reminder_sent` columns don't exist in the database.

**Solution:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run the file: `APPLY_REMINDER_MIGRATION.sql`
4. Verify columns were added (query results should show the columns)

**Quick Test:**
```sql
-- Check if columns exist
SELECT reminder_interval_days FROM admin_settings LIMIT 1;
SELECT last_reminder_sent FROM prayers LIMIT 1;
```

If you get an error like "column does not exist", you need to apply the migration.

---

### 2. **Edge Function Not Deployed**
**Problem:** The `send-prayer-reminders` function doesn't exist in Supabase.

**Solution:**
```bash
# Deploy the function
supabase functions deploy send-prayer-reminders
```

**Check if deployed:**
- Supabase Dashboard → Functions → Look for "send-prayer-reminders"

---

### 3. **Admin Settings Row Doesn't Exist**
**Problem:** No row in `admin_settings` table with `id = 1`.

**Solution:**
```sql
-- Check if row exists
SELECT * FROM admin_settings WHERE id = 1;

-- If no results, insert a row
INSERT INTO admin_settings (id, reminder_interval_days)
VALUES (1, 7)
ON CONFLICT (id) DO NOTHING;
```

---

### 4. **Reminder Interval Set to 0**
**Problem:** Reminders are disabled (interval = 0).

**Solution:**
1. Go to Admin Portal → Settings
2. Find "Prayer Update Reminders" section
3. Change value from 0 to 7 (or desired interval)
4. Click Save

---

### 5. **No Eligible Prayers**
**Problem:** No prayers meet the criteria for reminders.

**Check which prayers are eligible:**
```sql
SELECT 
  id, 
  title, 
  status, 
  approval_status, 
  email,
  last_reminder_sent
FROM prayers
WHERE status IN ('current', 'ongoing')
  AND approval_status = 'approved'
  AND email IS NOT NULL;
```

**Requirements for reminders:**
- Status must be 'current' or 'ongoing'
- Approval status must be 'approved'
- Must have an email address
- Either never reminded OR last reminder was >X days ago

---

### 6. **Service Role Key Issue**
**Problem:** Edge function can't access database (permissions).

**Check:**
- Supabase Dashboard → Settings → API
- Verify `service_role` key is set in function secrets

---

### 7. **Function Timeout or Error**
**Problem:** Function crashes or times out.

**Check Logs:**
1. Supabase Dashboard → Functions → send-prayer-reminders
2. Click on "Logs" tab
3. Look for error messages

Common errors in logs:
- `column "reminder_interval_days" does not exist` → Apply migration
- `column "last_reminder_sent" does not exist` → Apply migration
- `Function not found` → Deploy the function
- `null value in column "id"` → Check admin_settings has row

---

## Step-by-Step Verification

### Step 1: Check Database Schema
```sql
-- Should return a row showing the column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'admin_settings' 
  AND column_name = 'reminder_interval_days';

-- Should return a row showing the column exists
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'prayers' 
  AND column_name = 'last_reminder_sent';
```

**Expected:** Both queries return 1 row.  
**If not:** Run `APPLY_REMINDER_MIGRATION.sql`

---

### Step 2: Check Admin Settings
```sql
SELECT id, reminder_interval_days, notification_emails
FROM admin_settings 
WHERE id = 1;
```

**Expected:** 1 row with `reminder_interval_days` = 7 (or your configured value).  
**If not:** Insert/update the row.

---

### Step 3: Check Edge Function Exists
1. Go to Supabase Dashboard
2. Functions section
3. Look for `send-prayer-reminders`

**Expected:** Function listed.  
**If not:** Deploy with `supabase functions deploy send-prayer-reminders`

---

### Step 4: Test Function Manually
```bash
# Replace YOUR_PROJECT_REF and YOUR_SERVICE_KEY
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-prayer-reminders' \
  -H 'Authorization: Bearer YOUR_SERVICE_KEY' \
  -H 'Content-Type: application/json'
```

**Expected Response:**
```json
{
  "message": "Successfully sent X reminder emails",
  "sent": 0,
  "total": 0
}
```

Or if disabled:
```json
{
  "message": "Reminder emails are disabled",
  "sent": 0
}
```

---

### Step 5: Check for Eligible Prayers
```sql
-- See if any prayers should receive reminders
SELECT 
  id,
  title,
  email,
  status,
  approval_status,
  created_at,
  last_reminder_sent,
  CASE 
    WHEN last_reminder_sent IS NULL THEN 'Never reminded'
    WHEN last_reminder_sent < NOW() - INTERVAL '7 days' THEN 'Due for reminder'
    ELSE 'Recently reminded'
  END as reminder_status
FROM prayers
WHERE status IN ('current', 'ongoing')
  AND approval_status = 'approved'
ORDER BY last_reminder_sent NULLS FIRST;
```

---

## Getting More Details from the Error

The updated `runReminderCheck` function now shows detailed error messages. When you click "Send Reminders Now", you should see:

**Success:**
```
Successfully sent 3 reminder emails out of 3 eligible prayers
```

**Error with details:**
```
Error: Failed to fetch settings

Details: {
  "code": "PGRST116",
  "message": "The result contains 0 rows"
}
```

This tells you exactly what went wrong!

---

## Quick Fix Checklist

Try these in order:

- [ ] Apply migration: Run `APPLY_REMINDER_MIGRATION.sql` in Supabase SQL Editor
- [ ] Verify columns exist: Check with SQL queries above
- [ ] Deploy function: `supabase functions deploy send-prayer-reminders`
- [ ] Check admin settings: Verify row exists with `id = 1`
- [ ] Set interval > 0: Go to Settings, set to 7 days
- [ ] Create test prayer: Add a prayer, approve it, give it your email
- [ ] Test again: Click "Send Reminders Now"
- [ ] Check logs: Supabase Dashboard → Functions → Logs

---

## Still Not Working?

### Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Click "Send Reminders Now"
4. Look for error messages

### Check Function Logs
1. Supabase Dashboard
2. Functions → send-prayer-reminders
3. Logs tab
4. Look for recent invocations and any errors

### Test Direct Database Access
```sql
-- This tests if the basic query works
SELECT 
  id, 
  title, 
  email
FROM prayers
WHERE status IN ('current', 'ongoing')
  AND approval_status = 'approved'
LIMIT 5;
```

---

## Need Help?

Share these details:
1. Error message from the alert/UI
2. Browser console errors
3. Function logs from Supabase Dashboard
4. Result of this query:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name IN ('admin_settings', 'prayers') 
   AND column_name IN ('reminder_interval_days', 'last_reminder_sent');
   ```

This will help diagnose the exact issue!
