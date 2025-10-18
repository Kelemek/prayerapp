# Prayer Types Management Feature

## Overview
This feature allows administrators to dynamically manage the types available for prayer prompts, replacing the hardcoded enum with database-driven values.

## Database Schema

### Table: `prayer_types`
```sql
CREATE TABLE prayer_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Features
- **Unique type names**: Each type must have a unique name
- **Display ordering**: Types can be reordered using the `display_order` field
- **Active/Inactive states**: Types can be deactivated without deletion
- **Automatic timestamps**: `updated_at` is automatically updated on changes

## Components

### PrayerTypesManager
Location: `src/components/PrayerTypesManager.tsx`

**Features:**
- ✅ Add new prayer types
- ✅ Edit existing types (name, display order, active status)
- ✅ Delete types (with confirmation)
- ✅ Reorder types using up/down arrows
- ✅ Toggle active/inactive status
- ✅ Real-time list updates
- ✅ Success/error messaging

**UI Elements:**
- Type list with order controls
- Add Type button in header
- Edit/Delete/Activate buttons per type
- Form modal for add/edit operations
- Display order and creation date metadata

### Updated PromptManager
Location: `src/components/PromptManager.tsx`

**Changes:**
- ✅ Fetches active prayer types from database on mount
- ✅ Dropdown populated with database types instead of hardcoded enum
- ✅ CSV validation uses active types from database
- ✅ CSV upload instructions show current valid types
- ✅ Form defaults to first active type

## Migration

### File: `supabase/migrations/create_prayer_types.sql`

**What it does:**
1. Creates `prayer_types` table with RLS policies
2. Inserts default types (Healing, Guidance, Thanksgiving, etc.)
3. Creates indexes for performance
4. Sets up automatic timestamp updates

**To apply:**
1. Copy the SQL from the migration file
2. Go to Supabase Dashboard → SQL Editor
3. Paste and run the SQL
4. Verify with: `SELECT * FROM prayer_types ORDER BY display_order;`

## Integration

The PrayerTypesManager has been added to the Admin Portal Settings tab, between PromptManager and PasswordChange.

### Admin Portal Layout (Settings Tab):
1. Email Subscribers
2. Email Settings
3. **Prayer Prompts** (PromptManager)
4. **Prayer Types** (PrayerTypesManager) ← NEW
5. Password Change
6. Prayer Search

## Usage

### For Administrators

**Adding a Type:**
1. Click "Add Type" button
2. Enter type name (e.g., "Spiritual Growth")
3. Set display order (0-based, determines dropdown position)
4. Check "Active" to make it immediately available
5. Click "Add Type"

**Editing a Type:**
1. Click the edit (pencil) icon next to a type
2. Modify name, display order, or active status
3. Click "Update Type"

**Reordering Types:**
1. Use the up/down arrow buttons (grip vertical icons)
2. Types are swapped with their neighbors
3. Changes reflect immediately in dropdowns

**Deactivating a Type:**
1. Click the eye icon to toggle active/inactive
2. Inactive types don't appear in PromptManager dropdown
3. Existing prompts with inactive types are not affected

**Deleting a Type:**
1. Click the trash icon
2. Confirm deletion (warns about affecting existing prompts)
3. Type is permanently removed

### For Prayer Prompts

When creating or editing a prayer prompt:
- Only **active** types appear in the dropdown
- Types are ordered by their `display_order` value
- If no types exist, shows "Loading types..."
- CSV imports validate against active types

## Default Types

The migration creates these default types (display_order in parentheses):
1. Healing (1)
2. Guidance (2)
3. Thanksgiving (3)
4. Protection (4)
5. Family (5)
6. Finances (6)
7. Salvation (7)
8. Missions (8)
9. Other (9)

## TypeScript Types

### New Interface: `PrayerTypeRecord`
```typescript
export interface PrayerTypeRecord {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

Location: `src/types/prayer.ts`

## Notes

- **Backwards Compatible**: Existing `PrayerType` const and type still exist for compatibility
- **Application-Level Security**: RLS policies allow all operations; admin check enforced in UI
- **No Migration Required for Existing Data**: prayer_prompts table doesn't change
- **Type Flexibility**: Types can be added/removed without code changes
- **Ordering Persistence**: Display order is maintained across sessions

## Testing Checklist

- [ ] Run `create_prayer_types.sql` migration
- [ ] Verify default types appear in PrayerTypesManager
- [ ] Add a new custom type
- [ ] Edit an existing type
- [ ] Reorder types using arrows
- [ ] Deactivate a type and verify it doesn't show in PromptManager
- [ ] Reactivate a type
- [ ] Delete a type
- [ ] Create a prayer prompt with custom type
- [ ] CSV upload with new type name
- [ ] Verify CSV validation shows correct valid types

## Future Enhancements

Possible additions:
- Type icons/colors for visual distinction
- Type categories/grouping
- Usage statistics (count of prompts per type)
- Bulk import/export of types
- Type descriptions/tooltips
- Drag-and-drop reordering instead of arrows
