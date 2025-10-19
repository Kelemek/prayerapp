# Admin Settings Test Plan

## Current Status

### ✅ Completed Test Suites

1. **PasswordChange** - 29 tests ✅
   - All rendering tests
   - Password visibility toggles
   - Form validation
   - Submission handling
   - Error states

2. **EmailSettings** - 13 tests ✅
   - Loading and display
   - Email management
   - Distribution options
   - Individual section save buttons (4 sections)
   - Section headers

3. **PrayerSearch** - 21 tests ✅
   - Component rendering
   - Search functionality
   - Results display
   - Clear search
   - Select all
   - Delete operations
   - Status badges

### ❌ Remaining Test Suites Needed

4. **EmailSubscribers** (585 lines) - 0 tests
   - Priority: HIGH (complex component)
   - Estimated tests needed: 25-30

5. **PromptManager** (768 lines) - 0 tests
   - Priority: HIGH (most complex component)
   - Estimated tests needed: 30-35

6. **PrayerTypesManager** (431 lines) - 0 tests
   - Priority: MEDIUM
   - Estimated tests needed: 20-25

---

## Test Plan: EmailSubscribers

### Component Features
- Search subscribers by name/email
- Add individual subscriber
- Remove subscriber
- CSV upload with validation
- Bulk import
- Active/inactive toggle

### Recommended Test Categories

#### Rendering Tests (5-6 tests)
- Renders header and description
- Renders search input
- Renders "Add Subscriber" button
- Renders "Upload CSV" button
- Displays empty state message
- Shows subscriber count

#### Search Functionality (4-5 tests)
- Enables search on text input
- Performs search on button click
- Performs search on Enter key
- Displays search results
- Shows "no results" message
- Clears search properly

#### Add Subscriber Tests (5-6 tests)
- Shows add form when button clicked
- Validates email format
- Validates required fields
- Successfully adds subscriber
- Shows success message
- Clears form after add
- Shows error on duplicate email

#### Remove Subscriber Tests (3-4 tests)
- Shows remove button for each subscriber
- Requires confirmation before removal
- Successfully removes subscriber
- Updates list after removal

#### CSV Upload Tests (6-8 tests)
- Shows upload form when button clicked
- Validates CSV format
- Validates email addresses in CSV
- Shows preview of valid/invalid rows
- Allows uploading valid rows only
- Shows success message with count
- Handles CSV parsing errors
- Cancels upload properly

#### Active/Inactive Toggle (2-3 tests)
- Displays active status correctly
- Toggles status on click
- Updates database on toggle

---

## Test Plan: PromptManager

### Component Features
- Search prompts by title/type
- Add/Edit/Delete prompts
- Filter by prayer type
- CSV upload with validation
- Bulk import

### Recommended Test Categories

#### Rendering Tests (6-7 tests)
- Renders header and description
- Renders search input
- Renders "Add Prompt" button
- Renders "Upload CSV" button
- Displays prayer type dropdown
- Shows empty state
- Shows prompt count

#### Search Functionality (5-6 tests)
- Enables search on text input
- Performs search on button click
- Performs search on Enter key
- Displays search results
- Shows "no results" message
- Clears search properly

#### Prayer Type Filtering (3-4 tests)
- Loads prayer types on mount
- Filters prompts by type
- Shows all types option
- Updates results on filter change

#### Add Prompt Tests (6-7 tests)
- Shows add form when button clicked
- Validates required fields (title, type, description)
- Sets default prayer type
- Successfully creates prompt
- Shows success message
- Clears form after add
- Handles creation errors

#### Edit Prompt Tests (5-6 tests)
- Shows edit button for each prompt
- Populates form with existing data
- Updates prompt successfully
- Shows success message
- Cancels edit properly
- Handles update errors

#### Delete Prompt Tests (3-4 tests)
- Shows delete button for each prompt
- Requires confirmation before deletion
- Successfully deletes prompt
- Updates list after deletion

#### CSV Upload Tests (6-8 tests)
- Shows upload form when button clicked
- Validates CSV format (title, type, description)
- Validates prayer types exist
- Shows preview of valid/invalid rows
- Allows uploading valid rows only
- Shows success message with count
- Handles CSV parsing errors
- Cancels upload properly

---

## Test Plan: PrayerTypesManager

### Component Features
- List all prayer types
- Add new prayer type
- Edit existing prayer type
- Delete prayer type
- Reorder types (drag/drop or arrows)
- Toggle active/inactive status
- Display order management

### Recommended Test Categories

#### Rendering Tests (5-6 tests)
- Renders header and description
- Renders "Add Type" button
- Displays prayer types list
- Shows type properties (name, order, status)
- Displays empty state
- Shows loading state

#### Add Type Tests (5-6 tests)
- Shows add form when button clicked
- Validates required name field
- Sets default display order
- Sets default active status
- Successfully creates type
- Shows success message
- Clears form after add

#### Edit Type Tests (5-6 tests)
- Shows edit button for each type
- Populates form with existing data
- Updates type successfully
- Shows success message
- Cancels edit properly
- Prevents duplicate names

#### Delete Type Tests (3-4 tests)
- Shows delete button for each type
- Requires confirmation before deletion
- Successfully deletes type
- Updates list after deletion

#### Reorder Tests (3-4 tests)
- Shows reorder controls (arrows/drag handle)
- Updates display_order on reorder
- Persists new order to database
- Updates UI after reorder

#### Active/Inactive Toggle (2-3 tests)
- Displays active status correctly
- Toggles status on click
- Updates database on toggle
- Shows visual indicator for inactive

---

## Implementation Notes

### Common Test Patterns to Use

1. **Supabase Mocking Pattern**
```typescript
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            mockResolvedValue: vi.fn(),
          })),
        })),
      })),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    })),
  },
}));
```

2. **User Event Setup**
```typescript
const user = userEvent.setup();
await user.type(input, 'text');
await user.click(button);
```

3. **Confirmation Dialog Mock**
```typescript
global.confirm = vi.fn(() => true); // or false
```

4. **Wait for Async Updates**
```typescript
await waitFor(() => {
  expect(screen.getByText('Expected Text')).toBeDefined();
});
```

### Test File Naming Convention
- Component: `ComponentName.tsx`
- Test: `ComponentName.test.tsx`
- Location: Same directory as component

### Test Organization
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Feature Category', () => {
    it('specific behavior', () => {
      // test implementation
    });
  });
});
```

---

## Summary

**Total Test Coverage Goal**: ~110-125 tests across all 6 admin settings modules

**Current Progress**: 63 tests (57% complete)
- ✅ PasswordChange: 29 tests
- ✅ EmailSettings: 13 tests  
- ✅ PrayerSearch: 21 tests
- ❌ EmailSubscribers: 0 tests (need ~25-30)
- ❌ PromptManager: 0 tests (need ~30-35)
- ❌ PrayerTypesManager: 0 tests (need ~20-25)

**Next Steps**:
1. Create EmailSubscribers.test.tsx (Priority: HIGH)
2. Create PromptManager.test.tsx (Priority: HIGH)
3. Create PrayerTypesManager.test.tsx (Priority: MEDIUM)
4. Run full test suite to ensure all pass
5. Update test coverage documentation
