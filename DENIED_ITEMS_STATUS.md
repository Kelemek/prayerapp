# Denied Items Status Report

## Current Status of Denied Items Display

### ✅ Working - Shows in Denied Tab

1. **Denied Prayers**
   - ✅ Fetched from database
   - ✅ Displayed in Denied tab
   - ✅ Shows: requester, email, description, denial reason

2. **Denied Updates**
   - ✅ Fetched from database
   - ✅ Displayed in Denied tab
   - ✅ Shows: prayer title, content, author, denial reason

3. **Denied Status Change Requests**
   - ✅ Fetched from database
   - ✅ Displayed in Denied tab
   - ✅ Shows: prayer title, requested status, requester, denial reason

4. **Denied Deletion Requests** (Just Fixed!)
   - ✅ Fetched from database
   - ✅ Displayed in Denied tab
   - ✅ Shows: prayer title, deletion reason, requester, denial reason

### ❌ NOT Working - Missing from Denied Tab

5. **Denied Preference Changes**
   - ✅ Saved to database with `approval_status: 'denied'`
   - ❌ NOT fetched from database
   - ❌ NOT displayed in Denied tab
   - Location: `pending_preference_changes` table

## What Needs to Be Fixed

### Preference Changes Need:

1. **Add state for denied preference changes**
   ```typescript
   const [deniedPreferenceChanges, setDeniedPreferenceChanges] = useState([]);
   ```

2. **Fetch denied preference changes**
   ```typescript
   const { data } = await supabase
     .from('pending_preference_changes')
     .select('*')
     .eq('approval_status', 'denied')
     .order('reviewed_at', { ascending: false });
   ```

3. **Display in Denied tab**
   Add a section showing:
   - Name
   - Email
   - Requested preference (opt-in or opt-out)
   - Denial reason

## Current Denied Tab Count

Currently shows:
```typescript
Denied Items ({
  deniedPrayers.length + 
  deniedUpdates.length + 
  (deniedStatusChangeRequests?.length || 0) + 
  (deniedDeletionRequests?.length || 0)
})
```

Should also include:
```typescript
+ (deniedPreferenceChanges?.length || 0)
```

## Summary

| Request Type | Deny Saves to DB | Shows in Denied Tab |
|-------------|------------------|---------------------|
| Prayers | ✅ | ✅ |
| Updates | ✅ | ✅ |
| Status Changes | ✅ | ✅ |
| Deletions | ✅ | ✅ (just fixed) |
| Preference Changes | ✅ | ❌ (needs fix) |

## Recommendation

Would you like me to add denied preference changes to the Denied tab so all denied items are visible?
