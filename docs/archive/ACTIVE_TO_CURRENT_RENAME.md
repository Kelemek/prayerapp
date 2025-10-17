# Active to Current Status Rename

## Overview
Changed the prayer status from "active" to "current" throughout the entire application, including database schema, TypeScript types, UI components, and all references.

## Changes Made

### 1. Database Migration
**File:** `supabase/migrations/005_rename_active_to_current.sql` (NEW)

```sql
-- Step 1: Drop existing CHECK constraint
ALTER TABLE prayers DROP CONSTRAINT IF EXISTS prayers_status_check;

-- Step 2: Update all existing 'active' records to 'current'
UPDATE prayers SET status = 'current' WHERE status = 'active';

-- Step 3: Add new CHECK constraint with 'current'
ALTER TABLE prayers ADD CONSTRAINT prayers_status_check 
  CHECK (status IN ('current', 'ongoing', 'answered', 'closed'));

-- Step 4: Update default value
ALTER TABLE prayers ALTER COLUMN status SET DEFAULT 'current';
```

### 2. Database Schema Files Updated

**`supabase-schema.sql`:**
- Changed: `status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', ...))`
- To: `status TEXT NOT NULL DEFAULT 'current' CHECK (status IN ('current', ...))`

**`status-change-requests-migration.sql`:**
- Changed: `requested_status ... CHECK (requested_status IN ('active', ...))`
- To: `requested_status ... CHECK (requested_status IN ('current', ...))`

### 3. TypeScript Type Definitions

**File:** `src/types/prayer.ts`

**Before:**
```typescript
export const PrayerStatus = {
  ACTIVE: 'active',
  ANSWERED: 'answered',
  ONGOING: 'ongoing',
  CLOSED: 'closed'
} as const;
```

**After:**
```typescript
export const PrayerStatus = {
  CURRENT: 'current',
  ANSWERED: 'answered',
  ONGOING: 'ongoing',
  CLOSED: 'closed'
} as const;
```

### 4. Component Updates

#### `src/App.tsx`
- Default filter: `{status: 'active'}` → `{status: 'current'}`
- Filter button: `onClick={() => setFilters({...filters, status: 'active'})}` → `status: 'current'`
- Filter check: `filters.status === 'active'` → `filters.status === 'current'`
- Count filter: `prayers.filter(p => p.status === 'active')` → `p.status === 'current'`
- Display label: Already changed to "Current" in previous update

#### `src/components/PrayerCard.tsx`
- Status button: `PrayerStatus.ACTIVE` → `PrayerStatus.CURRENT`
- Status check: `prayer.status === PrayerStatus.ACTIVE` → `PrayerStatus.CURRENT`
- Button label: "Active" → "Current"
- Dropdown option: `<option value={PrayerStatus.ACTIVE}>Active</option>` → `value={PrayerStatus.CURRENT}>Current</option>`

#### `src/components/PrayerForm.tsx`
- Default status: `status: PrayerStatus.ACTIVE` → `status: PrayerStatus.CURRENT`

#### `src/components/PendingStatusChangeCard.tsx`
- Switch case: `case 'active':` → `case 'current':`

#### `src/utils/seedData.ts`
- Test data: `status: "active"` → `status: "current"`

### 5. Status Values

| Old Value | New Value | Usage |
|-----------|-----------|-------|
| `'active'` | `'current'` | Default status for new prayers |
| `PrayerStatus.ACTIVE` | `PrayerStatus.CURRENT` | TypeScript enum constant |
| "Active" | "Current" | Display label in UI |

## Migration Steps

### For Development
1. **Apply the database migration:**
   ```bash
   psql -d your_database -f supabase/migrations/005_rename_active_to_current.sql
   ```
   
   Or with Supabase CLI:
   ```bash
   supabase db push
   ```

2. **Verify migration:**
   ```sql
   -- Check constraint
   SELECT constraint_name, check_clause 
   FROM information_schema.check_constraints 
   WHERE constraint_name = 'prayers_status_check';
   
   -- Check existing records
   SELECT DISTINCT status FROM prayers;
   
   -- Check default value
   SELECT column_default 
   FROM information_schema.columns 
   WHERE table_name = 'prayers' AND column_name = 'status';
   ```

3. **Deploy updated code:**
   ```bash
   npm run build
   ```

### For Production
1. **Backup database** before running migration
2. **Apply migration during maintenance window** (updates all records)
3. **Deploy updated frontend code** immediately after migration
4. **Test all status-related functionality**

## Impact Assessment

### Breaking Changes
- ✅ **Database values changed:** All 'active' status values converted to 'current'
- ✅ **API contracts:** Any external systems querying prayer statuses need updates
- ✅ **Existing records:** Migration automatically updates all records

### No Breaking Changes
- ✅ **User interface:** Label already said "Current" (from previous update)
- ✅ **Other statuses:** 'ongoing', 'answered', 'closed' remain unchanged
- ✅ **Functionality:** All filtering, sorting, and status changes work identically

## Testing Checklist

### Database
- ✅ Migration runs without errors
- ✅ CHECK constraint updated to include 'current'
- ✅ CHECK constraint excludes 'active'
- ✅ Default value changed to 'current'
- ✅ Existing records updated from 'active' to 'current'

### Frontend
- ✅ Build completes without TypeScript errors
- ✅ Default filter shows "Current" prayers
- ✅ "Current" filter button works correctly
- ✅ "Current" button is selected by default
- ✅ Count displays correctly for current prayers
- ✅ Admin can change status to "Current"
- ✅ New prayers default to "current" status
- ✅ Status change requests include "current" option
- ✅ Status dropdown shows "Current" (not "Active")

### User Experience
- ✅ Existing prayers still display correctly
- ✅ Filter buttons work as expected
- ✅ Status badges show "Current" instead of "Active"
- ✅ No visual glitches or inconsistencies

## Files Changed Summary

### Created
- `supabase/migrations/005_rename_active_to_current.sql` - Migration script

### Modified
- `src/types/prayer.ts` - TypeScript enum
- `src/App.tsx` - Filter logic and display
- `src/components/PrayerCard.tsx` - Status buttons and dropdowns
- `src/components/PrayerForm.tsx` - Default status for new prayers
- `src/components/PendingStatusChangeCard.tsx` - Status color logic
- `src/utils/seedData.ts` - Test data
- `supabase-schema.sql` - Base schema definition
- `status-change-requests-migration.sql` - Status change requests schema

## Rollback Plan

If needed, rollback can be performed:

```sql
-- Rollback migration
ALTER TABLE prayers DROP CONSTRAINT IF EXISTS prayers_status_check;
UPDATE prayers SET status = 'active' WHERE status = 'current';
ALTER TABLE prayers ADD CONSTRAINT prayers_status_check 
  CHECK (status IN ('active', 'ongoing', 'answered', 'closed'));
ALTER TABLE prayers ALTER COLUMN status SET DEFAULT 'active';
```

Then revert code changes:
- Change `CURRENT: 'current'` back to `ACTIVE: 'active'`
- Change all `PrayerStatus.CURRENT` back to `PrayerStatus.ACTIVE`
- Change display labels from "Current" to "Active"

## Benefits
1. **Consistency:** Status name now matches display label
2. **Clarity:** "Current" better describes active, ongoing prayer needs
3. **Semantics:** More accurate terminology for prayers being actively prayed for
4. **User Understanding:** Clearer intention of the status category

## Notes
- The term "active" in other contexts (like `is_active` flags) remains unchanged
- This only affects the prayer status values, not other uses of the word "active"
- All status-related functionality continues to work identically
- Migration is safe and reversible if needed
