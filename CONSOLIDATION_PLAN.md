# Table Consolidation Plan: Merge to email_subscribers

## Overview
Consolidating `user_preferences` and `email_subscribers` into a single `email_subscribers` table with an `is_admin` flag.

## Phase 1: Database Migration

### Step 1: Add is_admin column to email_subscribers
```sql
ALTER TABLE email_subscribers 
ADD COLUMN is_admin BOOLEAN DEFAULT false;
```

### Step 2: Migrate data from user_preferences to email_subscribers
```sql
-- Insert users from user_preferences who don't exist in email_subscribers
INSERT INTO email_subscribers (email, name, is_active, is_admin, created_at, updated_at)
SELECT 
  up.email,
  up.name,
  up.receive_new_prayer_notifications as is_active,
  false as is_admin,
  up.created_at,
  up.updated_at
FROM user_preferences up
WHERE NOT EXISTS (
  SELECT 1 FROM email_subscribers es 
  WHERE es.email = up.email
)
ON CONFLICT (email) DO NOTHING;

-- Update existing email_subscribers with user_preferences data
UPDATE email_subscribers es
SET 
  name = up.name,
  is_active = up.receive_new_prayer_notifications,
  updated_at = NOW()
FROM user_preferences up
WHERE es.email = up.email
  AND es.is_admin = false;
```

### Step 3: Mark existing admin subscribers
```sql
-- Mark manually added subscribers as admins (optional - you decide who)
-- Example: UPDATE email_subscribers SET is_admin = true WHERE email = 'admin@example.com';
```

### Step 4: Update pending_preference_changes to use new structure
- Keep the table but it will reference email_subscribers now
- Or rename to pending_subscriber_changes for clarity

### Step 5: Drop user_preferences table (after verification)
```sql
-- ONLY AFTER EVERYTHING WORKS!
DROP TABLE user_preferences;
```

## Phase 2: Code Changes

### Files to Update:
1. ✅ `src/components/UserSettings.tsx` - Load/save to email_subscribers
2. ✅ `src/components/AdminPortal.tsx` - Update approval logic
3. ✅ `src/components/PendingPreferenceChangeCard.tsx` - Update if needed
4. ✅ `src/lib/emailNotifications.ts` - Already uses email_subscribers
5. ✅ Type definitions if any

## Phase 3: Testing Checklist

### Database Tests:
- [ ] email_subscribers has is_admin column
- [ ] All user_preferences data migrated
- [ ] No duplicate emails
- [ ] Admin subscribers marked correctly
- [ ] Active/inactive status matches preferences

### Functionality Tests:
- [ ] User can load preferences from email_subscribers
- [ ] User can submit preference changes
- [ ] Admin can approve preferences
- [ ] Approval updates email_subscribers correctly
- [ ] Email Settings shows all subscribers
- [ ] Can distinguish admins from users
- [ ] Emails sent to active subscribers only

## Rollback Plan

If something goes wrong:
1. Keep user_preferences table (don't drop it yet)
2. Revert code changes via git
3. Remove is_admin column if needed
4. Continue with two-table approach

## Migration Order

1. Create migration SQL file
2. Apply migration to database
3. Verify data migrated correctly
4. Update code files
5. Test thoroughly
6. Drop user_preferences table (final step)

---

## Detailed Implementation Below

