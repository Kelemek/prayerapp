# User Info localStorage Implementation

## Overview
Implemented automatic saving and loading of user name and email across all forms in the prayer app. This provides a better user experience by not requiring users to re-enter their information every time they interact with a form.

## Implementation Details

### New Utility File
Created `/src/utils/userInfoStorage.ts` with the following functions:
- `saveUserInfo(name: string, email: string)` - Saves user info to localStorage
- `getUserInfo()` - Retrieves saved user info from localStorage
- `clearUserInfo()` - Clears saved user info (for future use if needed)

### localStorage Keys
- `prayerapp_user_name` - Stores the user's name
- `prayerapp_user_email` - Stores the user's email

## Updated Components

### 1. PrayerForm.tsx
**Forms affected:**
- New Prayer Request form

**Changes:**
- Loads saved name and email when component mounts
- Saves name and email to localStorage on form submission
- Retains name and email after successful submission (clears other fields)

### 2. PrayerCard.tsx
**Forms affected:**
- Add Update form
- Delete Request form
- Status Change Request form
- Update Deletion Request form

**Changes:**
- Loads saved name and email when component mounts and populates all form fields
- Saves name and email to localStorage on each form submission
- Retains name and email after successful submission (clears only the content/reason fields)

## User Benefits

1. **Convenience**: Users only need to enter their name and email once
2. **Consistency**: Same name/email is used across all forms automatically
3. **Time-saving**: Faster form submission on repeat interactions
4. **Persistent**: Data persists across browser sessions (until localStorage is cleared)

## Privacy & Security Notes

- Data is stored locally in the user's browser only
- No sensitive information is transmitted or stored on the server beyond normal form submissions
- Users can clear this data by clearing their browser's localStorage/site data
- This is a convenience feature and doesn't affect the app's security model

## Future Enhancements

Possible future improvements:
- Add a "Clear my saved info" button in settings
- Add option to "Remember me" checkbox on forms
- Support for multiple user profiles on same browser (advanced use case)
