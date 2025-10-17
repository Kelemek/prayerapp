# Prayer Reminder Logic - Update-Based Approach

## What Changed

### Old Logic (Reminder-Based)
- Tracked when reminders were sent via `last_reminder_sent` column
- Sent reminders every X days regardless of prayer activity
- Could send reminders even if user recently posted an update

### New Logic (Activity-Based) ✅
- Checks when the last update was posted (or prayer was created if no updates)
- Only sends reminders if there's been NO activity for X days
- More intelligent - respects user engagement

---

## How It Works Now

### For Prayers WITH Updates:
```
Prayer created: Jan 1
Update posted: Jan 15
Current date: Jan 20
Interval: 7 days

Last activity: Jan 15 (most recent update)
Days since activity: 5 days
Action: NO REMINDER (activity too recent)
```

### For Prayers WITHOUT Updates:
```
Prayer created: Jan 1
No updates posted
Current date: Jan 20
Interval: 7 days

Last activity: Jan 1 (prayer creation)
Days since activity: 19 days
Action: SEND REMINDER (no activity for 19 days)
```

### After Update Is Posted:
```
Prayer created: Jan 1
Reminder sent: Jan 10 (ignored, not tracked anymore)
Update posted: Jan 15
Current date: Jan 20
Interval: 7 days

Last activity: Jan 15 (most recent update)
Days since activity: 5 days
Action: NO REMINDER (user just posted an update!)
```

---

## Benefits of This Approach

### ✅ More Intelligent
- Doesn't spam users who are actively updating
- Respects user engagement
- Only reminds when there's actual inactivity

### ✅ Simpler Database
- No need for `last_reminder_sent` column
- Uses existing `prayer_updates` table
- Leverages data that's already there

### ✅ Better User Experience
- User posts update → They won't get reminded immediately after
- User hasn't updated in a while → Gentle reminder
- Natural flow based on actual activity

### ✅ Prevents Annoyance
**Old way:**
- User posts update on Day 1
- Gets reminder on Day 7 (even though they just updated)
- Feels like spam

**New way:**
- User posts update on Day 1
- No reminder for 7 days from that update
- Only reminded if they go silent

---

## Example Scenarios

### Scenario 1: Active User
```
Jan 1: Prayer created
Jan 3: User posts update
Jan 5: User posts another update
Jan 7: System checks - last activity Jan 5 (2 days ago)
Result: No reminder (user is active!)
```

### Scenario 2: Inactive User
```
Jan 1: Prayer created
Jan 10: System checks - last activity Jan 1 (9 days ago)
Result: Reminder sent (no activity for 9 days)
```

### Scenario 3: User Returns After Reminder
```
Jan 1: Prayer created
Jan 10: Reminder sent (9 days of inactivity)
Jan 11: User posts update
Jan 17: System checks - last activity Jan 11 (6 days ago)
Result: No reminder (user responded and was recently active)
```

### Scenario 4: Mixed Activity
```
Jan 1: Prayer created
Jan 3: Update posted
Jan 15: System checks - last activity Jan 3 (12 days ago)
Result: Reminder sent (12 days since last update)
Jan 16: User posts update
Jan 20: System checks - last activity Jan 16 (4 days ago)
Result: No reminder (recently active)
```

---

## Technical Implementation

### Query Flow:
1. Get all current/ongoing approved prayers
2. For each prayer:
   ```sql
   SELECT created_at 
   FROM prayer_updates
   WHERE prayer_id = ?
   ORDER BY created_at DESC
   LIMIT 1
   ```
3. If update exists: `lastActivity = update.created_at`
4. If no update: `lastActivity = prayer.created_at`
5. If `lastActivity < (now - interval)`: Add to reminder list

### Code Logic:
```typescript
for (const prayer of potentialPrayers) {
  // Get most recent update
  const updates = await getUpdates(prayer.id)
  
  // Determine last activity
  const lastActivity = updates.length > 0 
    ? updates[0].created_at 
    : prayer.created_at
  
  // Check if inactive
  if (lastActivity < cutoffDate) {
    prayersNeedingReminders.push(prayer)
  }
}
```

---

## Configuration

### Setting: `reminder_interval_days`
**What it means now:**
"Send reminder if there have been NO updates for X days"

**Examples:**
- **7 days**: Remind if no updates for a week
- **14 days**: Remind if no updates for two weeks
- **30 days**: Remind if no updates for a month

### Recommended Values:
- **Active communities**: 7-10 days
- **Moderate engagement**: 14 days
- **Long-term prayers**: 30 days

---

## Comparison with Old Approach

| Aspect | Old (Reminder-Based) | New (Activity-Based) |
|--------|---------------------|---------------------|
| **Database** | Needed `last_reminder_sent` | Uses existing data |
| **Logic** | Fixed interval from last reminder | Based on actual activity |
| **User Experience** | Could spam after updates | Respects engagement |
| **Intelligence** | Timer-based | Activity-aware |
| **Complexity** | Simpler query, extra column | Smart query, no extra column |

---

## Edge Cases Handled

### Case 1: Multiple Updates in One Day
```
Jan 1 08:00 - Update 1
Jan 1 12:00 - Update 2
Jan 1 18:00 - Update 3

Last activity: Jan 1 18:00 (most recent)
User won't get reminded until X days after 18:00
```

### Case 2: Prayer Created but Never Approved Until Later
```
Jan 1: Created (pending)
Jan 5: Approved
Current: Jan 10 (5 days since approval)

Last activity: Jan 1 (creation date)
Days since activity: 9 days
Will send reminder if interval < 9 days
```

### Case 3: Update by Someone Else (Not Requester)
```
Jan 1: Prayer created by Alice
Jan 5: Bob posts update
Jan 12: System checks

Last activity: Jan 5 (Bob's update)
Alice won't get reminded (there was recent activity)

Note: This is good! It means the prayer is being 
engaged with by the community.
```

---

## Migration Impact

### What You DON'T Need:
- ❌ `last_reminder_sent` column
- ❌ Tracking reminder history
- ❌ Extra database writes after sending reminders

### What You DO Need:
- ✅ `reminder_interval_days` in admin_settings (already have)
- ✅ `prayer_updates` table (already exists)
- ✅ Edge function deployed with new logic

---

## Testing the New Logic

### Test 1: Prayer with Recent Update
```sql
-- Create test prayer
INSERT INTO prayers (title, requester, email, status, approval_status)
VALUES ('Test Prayer', 'John', 'john@example.com', 'current', 'approved');

-- Add recent update (3 days ago)
INSERT INTO prayer_updates (prayer_id, content, author, created_at)
VALUES ('prayer-id', 'Update', 'John', NOW() - INTERVAL '3 days');

-- Set interval to 7 days
UPDATE admin_settings SET reminder_interval_days = 7 WHERE id = 1;

-- Trigger reminders
-- Expected: No reminder (last activity 3 days ago < 7 days)
```

### Test 2: Prayer with Old Update
```sql
-- Add old update (10 days ago)
INSERT INTO prayer_updates (prayer_id, content, author, created_at)
VALUES ('prayer-id', 'Old update', 'John', NOW() - INTERVAL '10 days');

-- Trigger reminders
-- Expected: Reminder sent (last activity 10 days ago > 7 days)
```

### Test 3: Prayer with No Updates
```sql
-- Create prayer 15 days ago
INSERT INTO prayers (title, requester, email, status, approval_status, created_at)
VALUES ('Old Prayer', 'Jane', 'jane@example.com', 'current', 'approved', 
        NOW() - INTERVAL '15 days');

-- Trigger reminders
-- Expected: Reminder sent (no updates, created 15 days ago > 7 days)
```

---

## Summary

The new activity-based approach is **smarter**, **simpler**, and **more user-friendly**. It:

1. ✅ Only reminds when there's actual inactivity
2. ✅ Respects when users post updates
3. ✅ Uses existing database structure
4. ✅ Provides better user experience
5. ✅ Prevents reminder spam

**Bottom line:** Users get reminders when they've been silent, not just because time passed.
