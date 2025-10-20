# Email Verification System

## Overview
This feature adds **optional** email verification to all user-initiated actions that require admin approval. When enabled by an admin, users must verify their email address with a code before submitting prayers, updates, deletion requests, status changes, or preference changes.

## Admin Control
The feature can be enabled or disabled by administrators in **Admin Portal > Settings > Email Distribution**.

### Admin Setting: `require_email_verification`
- **Location**: Admin Portal > Settings tab
- **Default**: Disabled (false)
- **Effect**: When enabled, all user submissions require email verification
- **Database**: Stored in `admin_settings.require_email_verification` column

## Why This Feature?
- **Prevents spam**: Ensures valid email addresses
- **Confirms identity**: Verifies the person has access to the email
- **Reduces fraud**: Makes it harder to submit fake requests
- **Audit trail**: Links verified emails to all actions

## How It Works

### User Flow
1. **Admin enables** email verification in Admin Portal > Settings
2. User fills out a form (prayer, update, deletion, etc.)
3. User enters their email and clicks "Submit"
4. **System checks** if email verification is required
5. If enabled:
   - System sends a 6-digit verification code to their email
   - Dialog appears asking for the code
   - User enters the code from their email
   - System verifies the code
   - If valid, the action proceeds (request submitted)
   - If invalid or expired, user can request a new code
6. If disabled:
   - Action proceeds immediately (existing behavior)

### Technical Flow
```
┌─────────────┐
│ User Form   │
└──────┬──────┘
       │ Submit with email
       ▼
┌─────────────────────┐
│ Check Admin Setting │──────► If disabled, skip to Submit
└──────┬──────────────┘
       │ If enabled
       ▼
┌─────────────────────┐
│ Send Verification   │──────► Email with 6-digit code
│ Code Edge Function  │
└──────┬──────────────┘
       │ Code stored in DB
       ▼
┌─────────────────┐
│ Verification    │
│ Dialog (React)  │
└──────┬──────────┘
       │ User enters code
       ▼
┌─────────────────────┐
│ Verify Code Edge    │
│ Function            │
└──────┬──────────────┘
       │ Valid?
       ▼
┌─────────────────┐
│ Submit Request  │──────► Insert into DB
│ to Database     │
└─────────────────┘
```

## Database Schema

### Admin Settings Update
```sql
ALTER TABLE admin_settings 
ADD COLUMN require_email_verification BOOLEAN DEFAULT false;
```

**Purpose**: Global on/off switch for email verification feature

### Table: `verification_codes`
```sql
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'prayer_submission',
    'prayer_update',
    'deletion_request',
    'update_deletion_request',
    'status_change_request',
    'preference_change'
  )),
  action_data JSONB NOT NULL,  -- Stores the data to submit after verification
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_codes_email ON verification_codes(email);
CREATE INDEX idx_verification_codes_code ON verification_codes(code);
CREATE INDEX idx_verification_codes_expires_at ON verification_codes(expires_at);
```

**Fields:**
- `email`: The email address to verify
- `code`: 6-digit verification code
- `action_type`: Type of action being verified
- `action_data`: JSON containing the form data to submit after verification
- `expires_at`: Code expires after 15 minutes
- `used_at`: When the code was used (null = not used yet)

## Edge Functions

### 1. `send-verification-code`
**Purpose**: Generate and send verification code

**Request:**
```json
{
  "email": "user@example.com",
  "actionType": "prayer_submission",
  "actionData": {
    "title": "Prayer title",
    "description": "...",
    "requester": "John Doe",
    ...
  }
}
```

**Response:**
```json
{
  "success": true,
  "codeId": "uuid",
  "expiresAt": "2025-10-20T15:30:00Z"
}
```

**Process:**
1. Generate random 6-digit code
2. Store in `verification_codes` table with 15-minute expiration
3. Send email with code using Resend API
4. Return code ID for verification step

### 2. `verify-code`
**Purpose**: Verify code and return action data

**Request:**
```json
{
  "codeId": "uuid",
  "code": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "actionType": "prayer_submission",
  "actionData": { ... }
}
```

**Response (Invalid):**
```json
{
  "success": false,
  "error": "Invalid or expired code"
}
```

**Process:**
1. Look up code by ID and code value
2. Check if expired (`expires_at < NOW()`)
3. Check if already used (`used_at IS NOT NULL`)
4. If valid, mark as used and return action data
5. If invalid, return error

## React Components

### `VerificationDialog.tsx`
Modal dialog for code entry

**Props:**
```typescript
interface VerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (actionData: any) => void;
  email: string;
  codeId: string;
  expiresAt: string;
}
```

**Features:**
- 6-digit code input (auto-format)
- Countdown timer showing time until expiration
- "Resend Code" button
- "Verify" button
- Error messages
- Loading states

### `useVerification.ts` Hook
Custom hook to manage verification flow

**Usage:**
```typescript
const {
  requestCode,
  verifyCode,
  isEnabled,  // Checks admin setting
  isLoading,
  error
} = useVerification();

// Check if verification is required
if (!isEnabled) {
  // Skip verification, submit directly
  await submitPrayer(formData);
  return;
}

// Request code
const { codeId, expiresAt } = await requestCode(
  email,
  'prayer_submission',
  formData
);

// Verify code
const { actionType, actionData } = await verifyCode(codeId, code);
```

## Integration Points

### General Pattern
All submission flows follow this pattern:

```typescript
const handleSubmit = async (formData) => {
  // 1. Check if email verification is required
  const settings = await getAdminSettings();
  
  if (!settings.require_email_verification) {
    // Skip verification - submit directly
    await submitToDatabase(formData);
    return;
  }
  
  // 2. Request verification code
  const { codeId, expiresAt } = await requestCode(
    formData.email,
    'prayer_submission',
    formData
  );
  
  // 3. Show verification dialog
  setVerificationDialog({
    isOpen: true,
    codeId,
    expiresAt,
    email: formData.email
  });
};

const handleVerified = async (actionData) => {
  // 4. Submit verified data
  await submitToDatabase(actionData);
};
```

### 1. Prayer Submission
**File**: `src/components/PrayerRequestForm.tsx`

```typescript
const handleSubmit = async (formData) => {
  // 1. Request verification code
  const { codeId, expiresAt } = await requestCode(
    formData.email,
    'prayer_submission',
    formData
  );
  
  // 2. Show verification dialog
  setVerificationDialog({
    isOpen: true,
    codeId,
    expiresAt,
    email: formData.email
  });
};

const handleVerified = async (actionData) => {
  // 3. Submit verified prayer request
  await supabase.from('prayers').insert(actionData);
};
```

### 2. Prayer Update
**File**: `src/components/PrayerUpdateForm.tsx` (similar flow)

### 3. Deletion Request
**File**: Component that handles deletion requests (similar flow)

### 4. Status Change Request
**File**: Component that handles status changes (similar flow)

### 5. Preference Change
**File**: `src/components/Settings.tsx` (similar flow)

## Email Template

**Subject**: Your Verification Code for Prayer App

**Body**:
```
Hi there,

You requested to [action description] on the Prayer App.

Your verification code is:

┌─────────────────┐
│  1  2  3  4  5  6  │
└─────────────────┘

This code will expire in 15 minutes.

If you didn't request this, you can safely ignore this email.

---
Prayer App
```

## Security Considerations

1. **Expiration**: Codes expire after 15 minutes
2. **One-time use**: Codes can only be used once
3. **Rate limiting**: Consider adding rate limits to prevent abuse
4. **No code in URL**: Code sent via email only, never in URL params
5. **Cleanup**: Old codes should be cleaned up periodically

## Configuration

### Admin Portal Setup
1. Navigate to **Admin Portal**
2. Click **Settings** tab
3. Scroll to **Email Distribution** section
4. Check **"Require Email Verification (2FA)"** checkbox
5. Click **Save Settings**

### Environment Variables
```
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Settings
- Code length: 6 digits
- Expiration time: 15 minutes
- Email from name: "Prayer App"

## Future Enhancements

1. **SMS verification**: Add option to receive code via SMS
2. **Remember device**: Don't require verification for 30 days on same device
3. **Trusted emails**: Whitelist certain emails to skip verification
4. **Admin bypass**: Admins can configure verification requirements
5. **Analytics**: Track verification success/failure rates

## Testing

### Manual Testing
1. Submit a prayer with email
2. Check email for code
3. Enter code in dialog
4. Verify prayer is submitted
5. Try expired code (wait 15 minutes)
6. Try used code (use twice)
7. Try invalid code

### Edge Cases
- No email provided
- Invalid email format
- Email service down
- Code already used
- Code expired
- Wrong code entered multiple times

## Deployment Checklist

- [ ] Run database migration
- [ ] Deploy `send-verification-code` Edge Function
- [ ] Deploy `verify-code` Edge Function
- [ ] Configure Resend API key
- [ ] Test verification flow end-to-end
- [ ] Update user documentation
- [ ] Monitor error rates
- [ ] Set up cleanup job for old codes
