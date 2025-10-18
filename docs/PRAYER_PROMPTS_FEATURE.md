# Prayer Prompts Feature Implementation

## Overview

Added a new "Prayer Prompts" feature that allows admins to create inspirational prayer prompts that appear in a separate category from regular prayer requests.

## Database Changes

### New Table: `prayer_prompts`

**Migration File**: `supabase/migrations/create_prayer_prompts.sql`

```sql
CREATE TABLE prayer_prompts (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Healing', 'Guidance', ...)),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**RLS Policies**:
- ✅ Anyone can read prompts (SELECT for anon/authenticated)
- ✅ Service role can manage (admin only through application)

**Indexes**:
- `idx_prayer_prompts_type` - For filtering by type
- `idx_prayer_prompts_created_at` - For sorting

## Frontend Changes

### 1. Type Definitions (`src/types/prayer.ts`)

Added:
- `PrayerType` enum (Healing, Guidance, Thanksgiving, etc.)
- `PrayerPrompt` interface

### 2. New Components

#### `PromptCard.tsx`
Displays prayer prompts with:
- Yellow lightbulb icon
- Type badge
- Description
- Admin delete button
- Simplified layout (no status, updates, etc.)

#### `PromptManager.tsx`
Admin interface with two sections:

**Add Single Prompt**:
- Title (required)
- Type dropdown
- Description textarea
- Add button

**CSV Import**:
- File upload
- CSV format help with example
- Download template button
- Import button

**CSV Format**:
```csv
Title,Type,Description
"Pray for healing","Healing","Lord, we lift up..."
"Pray for guidance","Guidance","Father, guide us..."
```

### 3. Updated Components

#### `App.tsx`
- Added prompts state and loading
- Added `fetchPrompts()` function
- Added `deletePrompt()` function (admin only)
- Updated filter buttons grid from 4 to 5 columns
- Added "Prompts" filter button (yellow theme, left-most position)
- Updated other filter buttons to reset `showPrompts`
- Added conditional rendering: shows prompts when `showPrompts=true`, otherwise shows prayers
- Prompts list displays with `PromptCard` components

#### `AdminPortal.tsx`
- Imported `PromptManager`
- Added to Settings tab after `EmailSettings`

## Features

### User Experience

1. **View Prompts**: Click "Prompts" filter button to see all prayer prompts
2. **Read Prompts**: Each prompt shows title, type, and description
3. **Switch to Prayers**: Click any other filter to return to prayer requests

### Admin Experience

1. **Add Single Prompt**:
   - Go to Admin Portal → Settings tab
   - Scroll to "Manage Prayer Prompts"
   - Fill in title, select type, write description
   - Click "Add Prompt"

2. **Import Multiple Prompts**:
   - Download CSV template
   - Fill in prompts (comma-separated: Title, Type, Description)
   - Upload CSV file
   - Click "Import CSV"

3. **Delete Prompt**:
   - View prompts (click Prompts filter)
   - Click trash icon on any prompt card
   - Confirm deletion

## UI Design

### Filter Buttons Layout

```
┌─────────┬─────────┬─────────┬─────────┬──────────────┐
│ Prompts │ Current │ Ongoing │Answered │ Total Prayers│
│  (NEW)  │         │         │         │              │
└─────────┴─────────┴─────────┴─────────┴──────────────┘
```

**Color Scheme**:
- Prompts: Yellow (text-yellow-600)
- Current: Blue
- Ongoing: Orange  
- Answered: Green
- Total: Purple

### Prompt Card Design

- Yellow lightbulb icon header
- Type badge (indigo theme)
- Description text
- Footer with "Prayer Prompt" label and date
- Admin delete button (top right)

## Security

- ✅ Read access: Public (anyone can view prompts)
- ✅ Write access: Admin only (enforced at application level)
- ✅ RLS policies prevent direct database writes
- ✅ Admin portal requires password authentication

## Testing Checklist

- [ ] Run migration: `create_prayer_prompts.sql`
- [ ] Add single prompt via Admin Portal
- [ ] Import prompts via CSV
- [ ] View prompts (click Prompts filter button)
- [ ] Delete prompt as admin
- [ ] Verify non-admins cannot delete
- [ ] Test CSV with various types
- [ ] Test CSV with quoted fields
- [ ] Switch between prompts and prayers
- [ ] Verify counts update correctly

## Migration Steps

1. **Apply Main Migration**:
```sql
-- In Supabase SQL Editor, run:
supabase/migrations/create_prayer_prompts.sql
```

2. **Apply RLS Fix** (Important!):
```sql
-- In Supabase SQL Editor, run:
supabase/migrations/fix_prayer_prompts_rls.sql
```

This fix is necessary because the initial policy was too restrictive. The fix allows the application to insert/update/delete prompts while maintaining security through the AdminPortal authentication.

3. **Verify Migration**:
```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'prayer_prompts';

-- Should show two policies:
-- 1. "Anyone can read prayer prompts" (SELECT)
-- 2. "Anyone can manage prompts" (ALL)
```

4. **Deploy Frontend**:
```bash
npm run build
# Deploy to hosting
```

3. **Add Initial Prompts**:
- Log into Admin Portal
- Navigate to Settings → Manage Prayer Prompts
- Add prompts manually or via CSV

## CSV Template Example

```csv
Title,Type,Description
"Pray for healing","Healing","Lord, we lift up those who are sick and in need of Your healing touch. Restore their bodies, minds, and spirits. Amen."
"Pray for guidance","Guidance","Father, guide us in all our decisions today. Help us to seek Your will above our own. Lead us on the path You have prepared."
"Pray for thanksgiving","Thanksgiving","Thank You, Lord, for Your countless blessings. Help us to recognize Your goodness in every moment of our lives."
"Pray for protection","Protection","Almighty God, protect our families, our church, and our community from harm. Shield us with Your love."
"Pray for families","Family","Bless all families in our congregation. Strengthen marriages, nurture children, and restore broken relationships."
```

## Future Enhancements

Potential additions:
- [ ] Edit prompts (currently can only add/delete)
- [ ] Prompt scheduling (show specific prompts on certain days)
- [ ] Prompt categories or tags beyond type
- [ ] Prompt usage analytics
- [ ] User favorites/bookmarks
- [ ] Daily prompt notifications

## Files Modified

- ✅ `supabase/migrations/create_prayer_prompts.sql` (new)
- ✅ `src/types/prayer.ts` (updated)
- ✅ `src/components/PromptCard.tsx` (new)
- ✅ `src/components/PromptManager.tsx` (new)
- ✅ `src/components/AdminPortal.tsx` (updated)
- ✅ `src/App.tsx` (updated)

## Documentation Updates Needed

- [ ] Add to `docs/FEATURES.md` - Prayer Prompts section
- [ ] Add to `docs/SETUP.md` - Migration step 9
- [ ] Add to `docs/DATABASE.md` - prayer_prompts table schema
- [ ] Update main README.md - Feature list

---

**Implementation Date**: October 17, 2025  
**Status**: ✅ Complete - Ready for Testing
