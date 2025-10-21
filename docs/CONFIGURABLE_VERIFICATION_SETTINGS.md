# Configurable Verification Code Settings

## Overview
Admin can now configure both the **length** and **expiration time** of email verification (2FA) codes through the Admin Portal.

## Settings Available

### 1. Verification Code Length
**Location:** Admin Portal → Settings → Email Settings → "Verification Code Length"

**Options:**
- 4 digits
- 6 digits (recommended) ⭐
- 8 digits

**Security Analysis:**

| Length | Combinations | Brute Force Time* |
|--------|--------------|-------------------|
| 4 digits | 10,000 | ~2.8 hours |
| **6 digits** | **1,000,000** | **~11.6 days** ⭐ |
| 8 digits | 100,000,000 | ~3.2 years |

*Assuming 1 attempt per second with no rate limiting

**Recommendation:** 6 digits provides excellent security while being easy for users to type. This is the industry standard (used by Google, Microsoft, etc.).

### 2. Code Expiration Time
**Location:** Admin Portal → Settings → Email Settings → "Code Expiration Time"

**Options:**
- 5 minutes
- 10 minutes
- 15 minutes (recommended) ⭐
- 20 minutes
- 30 minutes
- 45 minutes
- 60 minutes

**Trade-offs:**

| Duration | User Experience | Security |
|----------|----------------|----------|
| 5 min | Rushed, may need resends | Excellent |
| 10 min | Tight but reasonable | Very good |
| **15 min** | **Comfortable for most** | **Good** ⭐ |
| 20-30 min | Relaxed | Fair |
| 45-60 min | Very relaxed | Lower |

**Recommendation:** 15 minutes is the sweet spot - enough time for users to check email and enter code, but short enough to maintain security.

## Configuration Changes

### Database Migration
Added two new columns to `admin_settings`:
```sql
-- Code length: 4, 6, or 8 digits only
verification_code_length INTEGER DEFAULT 6 CHECK (verification_code_length IN (4, 6, 8))

-- Expiry time: 5-60 minutes
verification_code_expiry_minutes INTEGER DEFAULT 15 CHECK (verification_code_expiry_minutes >= 5 AND verification_code_expiry_minutes <= 60)
```

### TypeScript Types
Updated `database.types.ts` to include both new fields in `admin_settings` interface.

### Admin Portal UI
**EmailSettings.tsx:**
- Both settings only visible when "Require Email Verification (2FA)" is enabled
- Styled consistently with other dropdowns on the site
- Clear labels and help text
- Recommended options marked

### Edge Function
**send-verification-code/index.ts:**
- Fetches both settings from database before generating code
- Falls back to defaults if settings not found (6 digits, 15 minutes)
- Logs configuration in use for debugging
- Generates code of specified length
- Calculates expiration based on admin setting

### Frontend Component
**VerificationDialog.tsx:**
- Already dynamically adjusts to code length (no changes needed)
- Timer shows exact expiration time regardless of setting
- Color coding: green (>1 min), orange (<1 min), red (expired)

## User Experience

### Admin Experience
1. Enable "Require Email Verification (2FA)"
2. Two new settings appear:
   - **Verification Code Length** dropdown (4, 6, 8 digits)
   - **Code Expiration Time** dropdown (5-60 minutes)
3. Choose preferred values (defaults shown as "recommended")
4. Click "Save Email Settings"
5. All future codes use new configuration immediately

### End User Experience
- Automatically adapts to admin's configuration
- Email shows code of configured length
- Dialog shows countdown timer based on configured expiry
- "Resend Code" gets fresh code with full time window
- No manual configuration needed

## Security Considerations

### Combined Security Analysis
The total security depends on **both** settings:

| Config | Combinations | Time Window | Risk Level |
|--------|-------------|-------------|------------|
| 4 digits, 60 min | 10,000 | 1 hour | ⚠️ High risk |
| 4 digits, 15 min | 10,000 | 15 min | ⚠️ Moderate risk |
| 6 digits, 60 min | 1M | 1 hour | ✓ Low risk |
| **6 digits, 15 min** | **1M** | **15 min** | **✓✓ Very low risk** ⭐ |
| 8 digits, 5 min | 100M | 5 min | ✓✓✓ Minimal risk |

**Additional Security Layers:**
- Single-use codes (can't be reused)
- Stored in database for audit trail
- Email delivery adds verification step
- Rate limiting recommended (future enhancement)

### Recommendations by Use Case

**Standard Security (Recommended):**
- 6 digits, 15 minutes
- Best balance of security and usability

**High Security:**
- 8 digits, 10 minutes
- For sensitive organizations

**User-Friendly:**
- 6 digits, 20 minutes
- For less tech-savvy users

**Not Recommended:**
- 4 digits with any expiry time
- Any setting with 60-minute expiry (too long)

## Implementation Details

### How It Works

1. **User Action:** User submits form (prayer, update, etc.)

2. **Code Generation:**
   - Frontend calls `send-verification-code` Edge Function
   - Edge Function fetches admin settings from database
   - Generates code of specified length (4, 6, or 8 digits)
   - Calculates expiry time (5-60 minutes from now)
   - Stores code with expiration timestamp in database
   - Sends email with code

3. **User Verification:**
   - VerificationDialog appears
   - Fetches code length from admin settings
   - Shows correct number of input boxes
   - Displays countdown timer showing time remaining
   - User enters code and submits

4. **Code Validation:**
   - Backend checks code matches
   - Checks code hasn't expired
   - Checks code hasn't been used
   - Marks code as used if valid
   - Returns action data to complete submission

### Backward Compatibility
- ✅ Defaults to 6 digits, 15 minutes if settings not found
- ✅ Existing codes remain valid until their expiration
- ✅ No breaking changes to API or database schema
- ✅ Works without migration (uses defaults)

## Testing Checklist

- [ ] Set code length to 4 digits → Verify 4-digit code received
- [ ] Set code length to 6 digits → Verify 6-digit code received
- [ ] Set code length to 8 digits → Verify 8-digit code received
- [ ] Set expiry to 5 minutes → Verify code expires after 5 min
- [ ] Set expiry to 15 minutes → Verify code expires after 15 min
- [ ] Set expiry to 60 minutes → Verify code expires after 60 min
- [ ] Change settings → Verify new codes use new settings immediately
- [ ] Dialog input boxes → Match code length setting
- [ ] Timer countdown → Matches expiry setting
- [ ] Expired code → Shows "Code expired" message
- [ ] Resend code → Gets fresh code with full time window

## Deployment

1. **Run Migration:**
   ```bash
   # Apply migration to add new columns
   supabase db push
   ```

2. **Deploy Edge Function:**
   ```bash
   # Re-deploy with updated code
   supabase functions deploy send-verification-code
   ```

3. **Deploy Frontend:**
   - Push code to repository
   - Build and deploy as normal
   - No special configuration needed

4. **Configure Settings:**
   - Log in to Admin Portal
   - Go to Settings → Email Settings
   - Enable "Require Email Verification (2FA)"
   - Choose preferred code length and expiry time
   - Click "Save Email Settings"

## Future Enhancements

Potential improvements:
- Rate limiting on code requests (prevent spam)
- Max attempts before lockout (prevent brute force)
- SMS verification as alternative to email
- Remember verified devices (skip verification for 30 days)
- Analytics dashboard showing verification success rates
- Configurable code format (numeric vs alphanumeric)
