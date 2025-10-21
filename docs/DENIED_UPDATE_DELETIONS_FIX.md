# Denied Update Deletion Requests Fix

## Problem
There were 3 denied items showing in the Denied tab, but the counter only showed 2. Investigation revealed that **denied update deletion requests** were not being counted or properly fetched.

## Root Cause
The system had 6 types of requests that could be denied:
1. Prayers ✅
2. Updates ✅  
3. Status Changes ✅
4. Prayer Deletions ✅
5. **Update Deletions** ❌ (was missing)
6. Preference Changes ✅

Update deletion requests could be denied (the `denyUpdateDeletionRequest` function existed), but they were:
- ❌ Not being fetched from the database when denied
- ❌ Not included in the denied items count
- ❌ Not displayed in the Denied tab

## Solution Implemented

### 1. Updated AdminData Interface
Added `deniedUpdateDeletionRequests` to the TypeScript interface in `src/hooks/useAdminData.ts`:

```typescript
interface AdminData {
  // ... existing fields
  deniedUpdateDeletionRequests: (UpdateDeletionRequest & {
    prayer_updates?: {
      content?: string;
      author?: string;
      author_email?: string;
      prayers?: { title?: string; };
    };
  })[];
  // ... rest of fields
}
```

### 2. Added Initial State
Updated the initial state to include the empty array:

```typescript
const [data, setData] = useState<AdminData>({
  // ... existing fields
  deniedUpdateDeletionRequests: [],
  // ... rest of fields
});
```

### 3. Fetched Denied Update Deletions from Database
Added database query in `fetchAdminData()`:

```typescript
// Fetch denied update deletion requests with update and prayer info
const { data: deniedUpdateDeletionRequests, error: deniedUpdateDeletionError } = await supabase
  .from('update_deletion_requests')
  .select(`
    *,
    prayer_updates (
      *,
      prayers (prayer_for, title)
    )
  `)
  .eq('approval_status', 'denied')
  .order('reviewed_at', { ascending: false });
```

### 4. Stored Data
Added to state update:

```typescript
setData({
  // ... existing fields
  deniedUpdateDeletionRequests: deniedUpdateDeletionRequests || [],
  // ... rest
});
```

### 5. Updated AdminPortal Component

**A. Import the data:**
```typescript
const {
  // ... existing fields
  deniedUpdateDeletionRequests,
  // ... rest
} = useAdminData();
```

**B. Updated denied items count:**
```typescript
Denied Items ({
  deniedPrayers.length + 
  deniedUpdates.length + 
  (deniedStatusChangeRequests?.length || 0) + 
  (deniedDeletionRequests?.length || 0) + 
  (deniedUpdateDeletionRequests?.length || 0) +  // Added!
  deniedPreferenceChanges.length
})
```

**C. Updated empty state check:**
```typescript
{deniedPrayers.length === 0 && 
 deniedUpdates.length === 0 && 
 (!deniedStatusChangeRequests || deniedStatusChangeRequests.length === 0) && 
 (!deniedDeletionRequests || deniedDeletionRequests.length === 0) && 
 (!deniedUpdateDeletionRequests || deniedUpdateDeletionRequests.length === 0) &&  // Added!
 deniedPreferenceChanges.length === 0 ? (
  // Empty state
) : (
  // Show denied items
)}
```

**D. Added display section for denied update deletions:**
```tsx
{/* Denied Update Deletion Requests */}
{deniedUpdateDeletionRequests && deniedUpdateDeletionRequests.length > 0 && (
  <div>
    <h3>Denied Update Deletion Requests ({deniedUpdateDeletionRequests.length})</h3>
    <div className="space-y-4">
      {deniedUpdateDeletionRequests.map((req) => (
        <div key={req.id} className="...">
          <Trash2 icon />
          <span>Update deletion request for: {req.prayer_updates?.prayers?.title}</span>
          <p>Update content: {req.prayer_updates?.content}</p>
          <p>Requested reason: {req.reason}</p>
          <p>Requested by: {req.requested_by}</p>
          <p>Denial reason: {req.denial_reason}</p>
          <span>Denied badge</span>
        </div>
      ))}
    </div>
  </div>
)}
```

## Files Modified

1. **src/hooks/useAdminData.ts**
   - Added `deniedUpdateDeletionRequests` to `AdminData` interface
   - Added to initial state
   - Added database query to fetch denied update deletions
   - Included in state update

2. **src/components/AdminPortal.tsx**
   - Imported `deniedUpdateDeletionRequests` from hook
   - Updated denied items count
   - Updated empty state condition
   - Added display section for denied update deletions

## Testing
✅ All 459 tests passing
✅ No TypeScript errors
✅ Real-time subscriptions already in place for update_deletion_requests

## User Experience
Now when an admin denies an update deletion request:
1. Request is marked as `approval_status: 'denied'` in database
2. Request disappears from "Deletions" tab (pending)
3. Request **appears in "Denied" tab** with:
   - Prayer title being referenced
   - The update content that was requested for deletion
   - Requested reason (why they wanted to delete the update)
   - Who requested the deletion
   - Denial reason (why admin denied it)
   - Red "Denied" badge

## Complete Denied Items Tracking

All **6 request types** now show up in the Denied tab:

| Request Type | Status |
|-------------|--------|
| ✅ Prayers | Working |
| ✅ Updates | Working |
| ✅ Status Changes | Working |
| ✅ Prayer Deletions | Working |
| ✅ **Update Deletions** | **Now Working!** |
| ✅ Preference Changes | Working |

## Result
✅ Counter now accurately shows all denied items
✅ Denied update deletion requests now appear in the Denied tab
✅ Complete tracking of ALL denied request types
✅ No more missing denied items
