# Denied Deletions Fix

## Problem
When denying a deletion request in the admin portal, it was being marked as denied in the database, but was not showing up in the "Denied" tab.

## Root Cause
The `useAdminData` hook was not fetching denied deletion requests from the database. It only fetched:
- Denied prayers
- Denied updates  
- Denied status change requests

But not denied deletion requests.

## Solution Implemented

### 1. Updated `AdminData` Interface
Added `deniedDeletionRequests` to the TypeScript interface in `src/hooks/useAdminData.ts`:

```typescript
interface AdminData {
  // ... existing fields
  deniedDeletionRequests: (DeletionRequest & { prayer_title?: string })[];
  // ... rest of fields
}
```

### 2. Added Initial State
Updated the initial state to include the empty array:

```typescript
const [data, setData] = useState<AdminData>({
  // ... existing fields
  deniedDeletionRequests: [],
  // ... rest of fields
});
```

### 3. Fetched Denied Deletions from Database
Added database query in `fetchAdminData()`:

```typescript
// Fetch denied deletion requests with prayer titles
const { data: deniedDeletionRequests, error: deniedDeletionRequestsError } = await supabase
  .from('deletion_requests')
  .select(`
    *,
    prayers!inner(title)
  `)
  .eq('approval_status', 'denied')
  .order('reviewed_at', { ascending: false });
```

### 4. Transformed and Stored Data
Added transformation to extract prayer title from joined data:

```typescript
const transformedDeniedDeletionRequests = (deniedDeletionRequests || []).map((req: Record<string, unknown>) => ({
  ...req,
  prayer_title: (req.prayers as Record<string, unknown> | undefined)?.title as string | undefined
})) as (DeletionRequest & { prayer_title?: string })[];
```

And included in state update:

```typescript
setData({
  // ... existing fields
  deniedDeletionRequests: transformedDeniedDeletionRequests,
  // ... rest of fields
});
```

### 5. Updated AdminPortal Component
Modified `src/components/AdminPortal.tsx` to:

**A. Import the data:**
```typescript
const {
  // ... existing fields
  deniedDeletionRequests,
  // ... rest
} = useAdminData();
```

**B. Updated denied items count:**
```typescript
Denied Items ({
  deniedPrayers.length + 
  deniedUpdates.length + 
  (deniedStatusChangeRequests?.length || 0) + 
  (deniedDeletionRequests?.length || 0)
})
```

**C. Updated empty state check:**
```typescript
{deniedPrayers.length === 0 && 
 deniedUpdates.length === 0 && 
 (!deniedStatusChangeRequests || deniedStatusChangeRequests.length === 0) && 
 (!deniedDeletionRequests || deniedDeletionRequests.length === 0) ? (
  // Empty state
) : (
  // Show denied items
)}
```

**D. Added display section for denied deletions:**
```tsx
{/* Denied Deletion Requests */}
{deniedDeletionRequests && deniedDeletionRequests.length > 0 && (
  <div>
    <h3>Denied Deletion Requests ({deniedDeletionRequests.length})</h3>
    <div className="space-y-4">
      {deniedDeletionRequests.map((req) => (
        <div key={req.id} className="...">
          <Trash2 icon />
          <span>Deletion request for: {req.prayer_title}</span>
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
   - Added `deniedDeletionRequests` to `AdminData` interface
   - Added to initial state
   - Added database query to fetch denied deletions
   - Added transformation logic
   - Included in state update

2. **src/components/AdminPortal.tsx**
   - Imported `deniedDeletionRequests` from hook
   - Updated denied items count
   - Updated empty state condition
   - Added display section for denied deletions

## Testing
✅ All 459 tests passing
✅ No TypeScript errors
✅ Real-time subscriptions for deletion_requests already in place

## User Experience
Now when an admin denies a deletion request:
1. Request is marked as `approval_status: 'denied'` in database
2. Request disappears from "Deletions" tab (pending)
3. Request **appears in "Denied" tab** with:
   - Prayer title being requested for deletion
   - Requested reason (why they wanted to delete)
   - Who requested the deletion
   - Denial reason (why admin denied it)
   - Red "Denied" badge

## Result
✅ Denied deletion requests now show up in the Denied tab
✅ Consistent with how denied prayers, updates, and status changes work
✅ Complete audit trail of all denied actions
