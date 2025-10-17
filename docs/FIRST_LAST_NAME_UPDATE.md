# First Name / Last Name Form Update

## Overview
Updated all forms in the prayer app to use separate **First Name** and **Last Name** fields instead of a single name field. Both fields are required, and they are concatenated together with a space before being saved to the database, maintaining backward compatibility with the existing database schema.

## Changes Made

### 1. Updated Storage Utility (`/src/utils/userInfoStorage.ts`)
**Changes:**
- Changed from storing single `name` to storing `firstName` and `lastName` separately
- Updated localStorage keys:
  - `prayerapp_user_first_name` - Stores first name
  - `prayerapp_user_last_name` - Stores last name
  - `prayerapp_user_email` - Stores email (unchanged)
- Updated `UserInfo` interface to include `firstName` and `lastName`
- Updated `saveUserInfo()` to accept 3 parameters: `firstName`, `lastName`, `email`
- Updated `getUserInfo()` to return `{ firstName, lastName, email }`

### 2. Updated PrayerForm Component (`/src/components/PrayerForm.tsx`)
**Changes:**
- Added separate state variables: `firstName` and `lastName`
- Removed single `requester` field from initial load
- Updated form UI:
  - Changed from single "Requested By" field
  - Now shows side-by-side "First Name" and "Last Name" fields using grid layout
  - Both fields are required
- Updated `handleSubmit()`:
  - Concatenates `firstName` and `lastName` with a space: `${firstName.trim()} ${lastName.trim()}`
  - Saves both names separately to localStorage
  - Passes concatenated full name to the database as `requester`

### 3. Updated PrayerCard Component (`/src/components/PrayerCard.tsx`)
**All 4 forms updated:**

#### A. Add Update Form
- Changed state: `updateAuthor` → `updateFirstName` and `updateLastName`
- Updated form fields to show First Name / Last Name side-by-side
- Concatenates names before submission

#### B. Delete Prayer Request Form
- Changed state: `deleteRequesterName` → `deleteRequesterFirstName` and `deleteRequesterLastName`
- Updated form fields to show First Name / Last Name side-by-side
- Concatenates names before submission

#### C. Status Change Request Form
- Changed state: `statusChangeRequesterName` → `statusChangeRequesterFirstName` and `statusChangeRequesterLastName`
- Updated form fields to show First Name / Last Name side-by-side
- Concatenates names before submission

#### D. Update Deletion Request Form
- Changed state: `updateDeleteRequesterName` → `updateDeleteRequesterFirstName` and `updateDeleteRequesterLastName`
- Updated form fields to show First Name / Last Name side-by-side
- Concatenates names before submission

### 4. Form Layout
All name field pairs use a grid layout:
```tsx
<div className="grid grid-cols-2 gap-2">
  <input placeholder="First name" ... />
  <input placeholder="Last name" ... />
</div>
```

## Database Compatibility
✅ **Fully backward compatible** - The database still receives a single `name` string, formed by concatenating first and last names with a space. No database schema changes are required.

## User Experience
- **Better data collection**: Separates first and last names for better organization
- **Persistent**: localStorage saves first and last names separately
- **Auto-fill**: Both fields are pre-filled on subsequent form opens
- **Editable**: Users can still modify pre-filled values
- **Required**: Both fields must be filled before submission
- **Clean layout**: Side-by-side fields maintain compact form design

## Testing Checklist
- [ ] Request Prayer form accepts first/last name and concatenates correctly
- [ ] Add Update form saves and loads first/last name from localStorage
- [ ] Delete Prayer Request form works with split name fields
- [ ] Status Change Request form works with split name fields
- [ ] Delete Update form works with split name fields
- [ ] localStorage properly stores and retrieves firstName and lastName
- [ ] Names are properly concatenated with space before database submission
- [ ] Both fields are required (form validation)
- [ ] Pre-filled values can be edited

## Migration Notes
- Existing localStorage data with old `prayerapp_user_name` key will not be automatically migrated
- Users who had saved data will need to re-enter their name once (will be split into first/last)
- All new submissions will save first and last names separately to localStorage
