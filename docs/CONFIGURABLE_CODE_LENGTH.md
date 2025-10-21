# Configurable Verification Code Length

## Overview
Added admin setting to configure the length of email verification codes (2FA codes). Admins can now choose between 4-8 digit codes, with 6 digits as the default.

## Changes Made

### 1. Database Migration (`supabase/migrations/20251020_create_verification_codes.sql`)
**Added:**
```sql
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS verification_code_length INTEGER DEFAULT 6 
CHECK (verification_code_length >= 4 AND verification_code_length <= 8);
```

- New column: `verification_code_length`
- Default value: 6 digits
- Constraint: Must be between 4-8 digits
- Comment: "Length of verification code (4-8 digits). Default is 6."

### 2. TypeScript Types (`src/lib/database.types.ts`)
**Added to admin_settings interface:**
```typescript
verification_code_length: number  // in Row
verification_code_length?: number // in Insert and Update
```

### 3. Admin Portal UI (`src/components/EmailSettings.tsx`)
**Added:**
- State: `verificationCodeLength` (default: 6)
- Loads from `admin_settings.verification_code_length`
- Saves to database on settings update
- Dropdown selector (4-8 digits)
- Only visible when "Require Email Verification" is enabled

**UI Location:**
- Admin Portal → Settings → Email Settings
- Under "Require Email Verification (2FA)" checkbox
- Appears as nested setting when 2FA is enabled

**UI Code:**
```tsx
{requireEmailVerification && (
  <div className="mt-4 ml-6">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      Verification Code Length
    </label>
    <select
      value={verificationCodeLength}
      onChange={(e) => setVerificationCodeLength(Number(e.target.value))}
      className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value={4}>4 digits</option>
      <option value={5}>5 digits</option>
      <option value={6}>6 digits</option>
      <option value={7}>7 digits</option>
      <option value={8}>8 digits</option>
    </select>
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      Length of verification code sent to users (4-8 digits, default: 6)
    </p>
  </div>
)}
```

### 4. Edge Function (`supabase/functions/send-verification-code/index.ts`)
**Updated:**

**generateCode() function:**
```typescript
// Old (hardcoded 6 digits):
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// New (configurable length):
function generateCode(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}
```

**Main handler:**
- Fetches `verification_code_length` from `admin_settings` before generating code
- Falls back to 6 digits if setting not found
- Logs the code length being used
- Generates code with specified length

**Code:**
```typescript
// Fetch admin settings to get code length
const settingsResponse = await fetch(`${SUPABASE_URL}/rest/v1/admin_settings?id=eq.1`, {
  method: 'GET',
  headers: {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  }
});

let codeLength = 6; // Default to 6 digits
if (settingsResponse.ok) {
  const settings = await settingsResponse.json();
  if (settings && settings.length > 0 && settings[0].verification_code_length) {
    codeLength = settings[0].verification_code_length;
  }
}

// Generate code with specified length
const code = generateCode(codeLength);
```

### 5. Verification Dialog (`src/components/VerificationDialog.tsx`)
**Updated:**
- Added `codeLength` state (default: 6)
- Fetches code length from `admin_settings` when dialog opens
- Dynamically creates array of inputs based on code length
- Updates text to show `{codeLength}-digit code`

**Key Changes:**
```typescript
const [codeLength, setCodeLength] = useState<number>(6);
const [code, setCode] = useState<string[]>([]);

// Fetch code length from admin settings
useEffect(() => {
  const fetchCodeLength = async () => {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('verification_code_length')
      .eq('id', 1)
      .maybeSingle();

    if (!error && data?.verification_code_length) {
      const length = data.verification_code_length;
      setCodeLength(length);
      setCode(new Array(length).fill(''));
    } else {
      setCode(new Array(6).fill(''));
    }
  };

  if (isOpen) {
    fetchCodeLength();
  }
}, [isOpen]);
```

## User Experience

### Admin Experience
1. Navigate to Admin Portal → Settings → Email Settings
2. Enable "Require Email Verification (2FA)" checkbox
3. Dropdown appears: "Verification Code Length"
4. Select desired length (4-8 digits)
5. Click "Save Email Settings"
6. All future verification codes use new length

### User Experience
**4-digit code:**
```
We've sent a 4-digit code to user@example.com
[_] [_] [_] [_]
```

**6-digit code (default):**
```
We've sent a 6-digit code to user@example.com
[_] [_] [_] [_] [_] [_]
```

**8-digit code:**
```
We've sent a 8-digit code to user@example.com
[_] [_] [_] [_] [_] [_] [_] [_]
```

## Security Considerations

### Code Length vs Security

| Length | Combinations | Brute Force Time (1/sec) | Brute Force Time (10/sec) |
|--------|-------------|--------------------------|---------------------------|
| 4 digits | 10,000 | ~2.8 hours | ~17 minutes |
| 5 digits | 100,000 | ~27.8 hours | ~2.8 hours |
| **6 digits** | **1,000,000** | **~11.6 days** | **~27.8 hours** |
| 7 digits | 10,000,000 | ~115.7 days | ~11.6 days |
| 8 digits | 100,000,000 | ~3.2 years | ~115.7 days |

**Additional Security Measures:**
- 15-minute expiration on all codes
- Single-use codes (can't be reused)
- Rate limiting (recommended to implement)
- Database logging of all attempts

**Recommendations:**
- **4 digits**: Only for very low-security scenarios or testing
- **5 digits**: Suitable for low-security applications
- **6 digits (default)**: Industry standard, good balance of security and usability
- **7-8 digits**: High security, but may frustrate users

## Default Behavior

- Default code length: **6 digits**
- If `verification_code_length` column doesn't exist: defaults to 6
- If setting is NULL: defaults to 6
- If database query fails: defaults to 6

## Migration Path

### For Existing Installations
1. Run the updated migration (adds column with DEFAULT 6)
2. Existing codes in `verification_codes` table remain valid
3. New codes generated after migration use admin setting
4. No user-facing changes if admin doesn't change setting

### For New Installations
1. Migration creates column with default value 6
2. Admin can optionally change in Email Settings
3. All codes use configured length from start

## Testing

### Test Scenarios

1. **Default behavior (6 digits)**
   - Enable 2FA without changing code length
   - Submit form
   - Verify 6-digit code is sent
   - Verify dialog shows 6 input boxes

2. **4-digit codes**
   - Change setting to 4 digits
   - Submit form
   - Verify 4-digit code is sent
   - Verify dialog shows 4 input boxes

3. **8-digit codes**
   - Change setting to 8 digits
   - Submit form
   - Verify 8-digit code is sent
   - Verify dialog shows 8 input boxes

4. **Setting persistence**
   - Change code length
   - Save settings
   - Reload page
   - Verify setting is retained

5. **Edge cases**
   - Database has no admin_settings row → defaults to 6
   - Setting is NULL → defaults to 6
   - Invalid value in database → constraint prevents save

## Troubleshooting

### Problem: Codes still 6 digits after changing setting
**Check:**
- Setting was saved successfully
- Edge Function fetched new setting
- Browser cache cleared

**Solution:**
- Check admin_settings table: `SELECT verification_code_length FROM admin_settings WHERE id = 1;`
- Redeploy Edge Function if needed
- Clear browser cache and retry

### Problem: Dialog shows wrong number of boxes
**Check:**
- VerificationDialog fetched setting successfully
- Browser console for errors

**Solution:**
- Hard refresh page (Cmd+Shift+R / Ctrl+Shift+F5)
- Check network tab for admin_settings query
- Verify database column exists

### Problem: Can't save code length in admin portal
**Check:**
- Database constraint allows value (4-8)
- Migration ran successfully
- User has permission to update admin_settings

**Solution:**
- Check database column exists: `\d admin_settings`
- Verify constraint: Should allow 4-8
- Check browser console for error details

## Future Enhancements

Potential improvements:
1. Add rate limiting per email address
2. Configurable expiration time (currently hardcoded 15 minutes)
3. Option for alphanumeric codes (not just numeric)
4. Support for special characters in codes
5. Maximum attempts per code
6. Blacklist certain code patterns (e.g., "123456")
7. Admin analytics on code usage/failure rates

## Compatibility

- **Backward Compatible**: Yes, defaults to 6 digits
- **Breaking Changes**: None
- **Database Changes**: Adds one column with default value
- **API Changes**: None (Edge Function maintains same interface)
- **Frontend Changes**: Automatic adjustment to code length

## Summary

This feature gives admins control over security vs usability trade-off:
- **Shorter codes** (4-5 digits): Easier for users to type, less secure
- **Medium codes** (6 digits): Industry standard, balanced
- **Longer codes** (7-8 digits): More secure, may frustrate users

The default remains 6 digits to maintain current behavior and align with industry standards (used by Google, Microsoft, Apple, etc.).
