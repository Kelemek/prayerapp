# Email Verification - Prayer Form Integration

## Overview
Successfully integrated email verification (2FA) into the prayer request submission form (`PrayerForm.tsx`). This is the first implementation example that demonstrates the verification workflow.

## Changes Made

### File Modified: `src/components/PrayerForm.tsx`

#### 1. **Added Imports**
```typescript
import { useVerification } from '../hooks/useVerification';
import { VerificationDialog } from './VerificationDialog';
```

#### 2. **Added Verification State**
```typescript
const { isEnabled, requestCode, verifyCode } = useVerification();
const [verificationState, setVerificationState] = useState<{
  isOpen: boolean;
  codeId: string | null;
  expiresAt: string | null;
  email: string;
}>({
  isOpen: false,
  codeId: null,
  expiresAt: null,
  email: ''
});
```

#### 3. **Modified handleSubmit to Check for Verification**
The original `handleSubmit` function now:
1. Prepares the prayer data as before
2. **NEW**: Checks if email verification is enabled (`isEnabled`)
3. **IF ENABLED**: Requests a verification code and shows the VerificationDialog
4. **IF DISABLED**: Submits the prayer directly (original behavior)

```typescript
// Check if email verification is required
if (isEnabled) {
  // Request verification code
  const { codeId, expiresAt } = await requestCode(
    formData.email,
    'prayer_submission',
    prayerData
  );
  
  // Show verification dialog
  setVerificationState({
    isOpen: true,
    codeId,
    expiresAt,
    email: formData.email
  });
} else {
  // No verification required, submit directly
  await submitPrayer(prayerData);
}
```

#### 4. **Extracted Submission Logic**
Created a separate `submitPrayer` function that contains the original submission logic:
- Calls the `onSubmit` callback
- Shows success message
- Clears the form
- Keeps user info for next submission

#### 5. **Added Verification Handlers**

**handleVerified**: Called when the user successfully enters the verification code
```typescript
const handleVerified = async (actionData: any) => {
  try {
    await submitPrayer(actionData);
    
    // Close verification dialog
    setVerificationState({
      isOpen: false,
      codeId: null,
      expiresAt: null,
      email: ''
    });
  } catch (error) {
    console.error('Failed to submit verified prayer:', error);
    throw error;
  }
};
```

**handleVerificationCancel**: Called when user cancels the verification dialog
```typescript
const handleVerificationCancel = () => {
  setVerificationState({
    isOpen: false,
    codeId: null,
    expiresAt: null,
    email: ''
  });
  setIsSubmitting(false);
};
```

**handleResendCode**: Called when user clicks "Resend Code" in the verification dialog
```typescript
const handleResendCode = async () => {
  try {
    if (!formData.email) return;

    // Prepare the prayer data
    const prayerData = { /* ... */ };

    // Request new verification code
    const { codeId, expiresAt } = await requestCode(
      formData.email,
      'prayer_submission',
      prayerData
    );
    
    // Update verification state with new code
    setVerificationState(prev => ({
      ...prev,
      codeId,
      expiresAt
    }));
  } catch (error) {
    console.error('Failed to resend verification code:', error);
    throw error;
  }
};
```

#### 6. **Added VerificationDialog Component**
Conditionally renders the verification dialog when needed:
```tsx
{verificationState.isOpen && verificationState.codeId && verificationState.expiresAt && (
  <VerificationDialog
    isOpen={verificationState.isOpen}
    codeId={verificationState.codeId}
    expiresAt={verificationState.expiresAt}
    email={verificationState.email}
    onVerified={handleVerified}
    onClose={handleVerificationCancel}
    onResend={handleResendCode}
  />
)}
```

## User Flow

### When Verification is DISABLED (Default)
1. User fills out prayer request form
2. User clicks "Submit Prayer Request"
3. Prayer is submitted directly to database
4. Success message is shown
5. Form clears (keeps name/email)

### When Verification is ENABLED (Admin Setting)
1. User fills out prayer request form
2. User clicks "Submit Prayer Request"
3. **NEW**: Verification code is sent to user's email
4. **NEW**: VerificationDialog appears with 6-digit code entry
5. **NEW**: User enters code from email
6. **NEW**: Code is validated against database
7. Prayer is submitted to database
8. Success message is shown
9. Form clears (keeps name/email)

### Verification Dialog Features
- 6 individual input boxes for code digits
- Auto-focus and auto-advance between boxes
- Paste support (paste full 6-digit code)
- Countdown timer showing time remaining
- "Resend Code" button (disabled during countdown)
- Cancel button to abort submission
- Clear error messages for invalid codes

## Integration Pattern

This implementation serves as the **reference pattern** for integrating email verification into other forms:

1. **Import** `useVerification` hook and `VerificationDialog` component
2. **Add state** for verification dialog (isOpen, codeId, expiresAt, email)
3. **Check** `isEnabled` in submission handler
4. **Call** `requestCode()` if enabled, or submit directly if disabled
5. **Show** VerificationDialog when verification is needed
6. **Handle** verification callbacks (onVerified, onClose, onResend)
7. **Extract** actual submission logic to separate function

## Next Steps

Apply this same pattern to:
- Prayer update submissions (`PrayerCard.tsx` - `handleAddUpdate`)
- Prayer deletion requests (`PrayerCard.tsx` - `handleDeleteRequest`)
- Status change requests (`PrayerCard.tsx` - `handleStatusChangeRequest`)
- Update deletion requests (`PrayerCard.tsx` - `handleUpdateDeletionRequest`)
- Preference change requests (preference components)

## Testing Checklist

- [ ] Test prayer submission with verification DISABLED
- [ ] Test prayer submission with verification ENABLED
- [ ] Verify email is sent with correct code
- [ ] Test entering correct code
- [ ] Test entering incorrect code
- [ ] Test code expiration (15 minutes)
- [ ] Test "Resend Code" functionality
- [ ] Test canceling verification dialog
- [ ] Test paste functionality in code inputs
- [ ] Verify form state is preserved/cleared correctly

## Admin Configuration

Admins can enable/disable email verification in:
**Admin Portal → Settings → Email Settings**

Look for: "Require Email Verification for User Actions" toggle

When enabled, all user-initiated actions will require email verification before being processed.
