# Denied Preference Changes Implementation

## Problem
Denied preference change requests were being saved to the database but were not showing up in the "Denied" tab of the admin portal.

## Solution Implemented

### 1. Updated Interface & State
Added `denial_reason` and `reviewed_at` fields to the interface:

```typescript
interface PendingPreferenceChange {
  id: string;
  name: string;
  email: string;
  receive_new_prayer_notifications: boolean;
  created_at: string;
  denial_reason?: string;  // Added
  reviewed_at?: string;     // Added
}
```

Added state for denied preference changes:
```typescript
const [deniedPreferenceChanges, setDeniedPreferenceChanges] = useState<PendingPreferenceChange[]>([]);
```

### 2. Fetched Denied Preference Changes
Added database query to fetch denied preferences on component mount:

```typescript
const fetchDeniedPreferenceChanges = async () => {
  const { data, error } = await supabase
    .from('pending_preference_changes')
    .select('*')
    .eq('approval_status', 'denied')
    .order('reviewed_at', { ascending: false });
    
  if (error) throw error;
  setDeniedPreferenceChanges(data || []);
};
```

### 3. Updated Denied Tab Count
Updated the denied items count to include preference changes:

```typescript
Denied Items ({
  deniedPrayers.length + 
  deniedUpdates.length + 
  (deniedStatusChangeRequests?.length || 0) + 
  (deniedDeletionRequests?.length || 0) + 
  deniedPreferenceChanges.length  // Added
})
```

### 4. Updated Empty State Check
Updated the conditional to check for denied preference changes:

```typescript
{deniedPrayers.length === 0 && 
 deniedUpdates.length === 0 && 
 (!deniedStatusChangeRequests || deniedStatusChangeRequests.length === 0) && 
 (!deniedDeletionRequests || deniedDeletionRequests.length === 0) && 
 deniedPreferenceChanges.length === 0 ? (  // Added
  // Show empty state
) : (
  // Show denied items
)}
```

Updated empty state message:
```
"Denied prayers, updates, status changes, deletions, and preference changes will appear here."
```

### 5. Added Display Section
Created a new section in the Denied tab to display denied preference changes:

```tsx
{/* Denied Preference Changes */}
{deniedPreferenceChanges && deniedPreferenceChanges.length > 0 && (
  <div>
    <h3>Denied Preference Changes ({deniedPreferenceChanges.length})</h3>
    <div className="space-y-4">
      {deniedPreferenceChanges.map((change) => (
        <div key={change.id} className="...">
          <User icon />
          <span>{change.name}</span>
          <p>Email: {change.email}</p>
          <p>Requested preference: {
            change.receive_new_prayer_notifications 
              ? 'Opt-in to notifications' 
              : 'Opt-out of notifications'
          }</p>
          <p>Denial reason: {change.denial_reason}</p>
          <span>Denied badge</span>
        </div>
      ))}
    </div>
  </div>
)}
```

### 6. Updated Deny Function
Modified the `handleDenyPreferenceChange` function to refresh the denied list:

```typescript
// After denying and sending email
const { data: deniedData } = await supabase
  .from('pending_preference_changes')
  .select('*')
  .eq('approval_status', 'denied')
  .order('reviewed_at', { ascending: false });

if (deniedData) {
  setDeniedPreferenceChanges(deniedData);
}
```

## Files Modified

**src/components/AdminPortal.tsx**
- Added `denial_reason` and `reviewed_at` to `PendingPreferenceChange` interface
- Added `deniedPreferenceChanges` state
- Added fetch for denied preference changes in useEffect
- Updated denied items count
- Updated empty state condition and message
- Added display section for denied preference changes
- Updated deny handler to refresh denied list

## Testing
✅ All 459 tests passing
✅ No TypeScript errors

## User Experience

When an admin denies a preference change request:

1. **Pending Tab**: Request disappears from "Preferences" tab
2. **Denied Tab**: Request appears with:
   - User's name
   - User's email
   - Requested preference (Opt-in or Opt-out)
   - Denial reason
   - Red "Denied" badge

## Complete Denied Items Tracking

All 5 request types now show up in the Denied tab:

| Request Type | Status |
|-------------|--------|
| ✅ Prayers | Working |
| ✅ Updates | Working |
| ✅ Status Changes | Working |
| ✅ Deletions | Working |
| ✅ Preference Changes | **Now Working!** |

## Benefits

1. **Complete audit trail** - All denied actions are tracked and visible
2. **Transparency** - Admins can review why requests were denied
3. **Consistency** - All request types behave the same way
4. **Accountability** - Denial reasons are recorded and displayed
5. **User communication** - Email notifications sent with denial reasons

## Result
✅ Denied preference changes now appear in the Denied tab
✅ Complete tracking of all denied requests across the system
✅ Consistent behavior across all 5 request types
