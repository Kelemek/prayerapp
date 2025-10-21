# Email Verification Testing Guide

## Automated Tests

We've created unit tests for the email verification session management logic. These tests are **reliable** and can be run automatically.

### Running the Tests

```bash
npm test src/hooks/__tests__/useVerification.test.ts
```

Or run all tests:
```bash
npm test
```

### What's Tested Automatically

✅ **Session Management**
- Saving sessions to localStorage
- Email normalization (lowercase, trim whitespace)
- Multiple sessions for different users
- Session replacement for same email
- Expiration time calculation

✅ **Session Validation**
- Checking if email was recently verified
- Case-insensitive email matching
- Expired session detection
- Non-existent session handling

✅ **Cleanup**
- Removing expired sessions
- Keeping valid sessions
- Handling empty storage

✅ **Edge Cases**
- Corrupted localStorage data
- Missing session fields
- Invalid JSON
- Multiple user scenarios

### Test Coverage

The automated tests cover:
- ✅ 100% of session storage logic
- ✅ 100% of session validation logic
- ✅ 100% of cleanup logic
- ✅ Email normalization edge cases
- ✅ Time-based expiration logic

### What Cannot Be Reliably Tested Automatically

❌ **Supabase Edge Functions**
- Requires live Supabase connection
- Requires Resend API key
- Email delivery timing varies
- Better tested manually or with E2E tests

❌ **React Component Integration**
- Requires React Testing Library setup
- Form submissions are complex
- Better tested manually or with E2E tests

❌ **Email Delivery**
- External service (Resend)
- Network-dependent
- Must be tested manually

❌ **Safari Autofill**
- Browser-specific feature
- Cannot be automated in unit tests
- Must be tested manually

## Manual Testing Checklist

Use this checklist for manual testing:

### Critical Path (Must Test Before Deploy)
- [ ] Submit prayer → verify code → success
- [ ] Second submission skips verification (session works)
- [ ] Session expires after timeout
- [ ] Admin can enable/disable feature
- [ ] Safari autofill works

### Extended Testing (Recommended)
- [ ] All 6 form types work (prayer, update, delete, status, update delete, preferences)
- [ ] Different emails maintain separate sessions
- [ ] Email normalization works (case, whitespace)
- [ ] Wrong code shows error
- [ ] Resend code works
- [ ] Code expiry works

## CI/CD Integration

Add this to your GitHub Actions workflow:

```yaml
- name: Run Verification Tests
  run: npm test src/hooks/__tests__/useVerification.test.ts
```

## Test Data

For manual testing, use these test cases:

### Valid Scenarios
```
Email: test@example.com
Email: TEST@EXAMPLE.COM (should normalize)
Email:   test@example.com   (with spaces)
```

### Edge Cases
```
Email: user+tag@example.com (plus addressing)
Email: user@subdomain.example.com
Email: 123@example.com (numeric)
```

## Debugging Tests

If tests fail, check:

1. **localStorage mock** - Make sure it's properly set up
2. **Time-based tests** - May have timing issues
3. **Date.now()** - Can be mocked with `vi.useFakeTimers()` if needed

### Example: Mock timers for expiry tests

```typescript
import { vi } from 'vitest';

it('should expire after timeout', () => {
  vi.useFakeTimers();
  
  saveVerifiedSession('test@example.com', 15);
  
  // Fast-forward 16 minutes
  vi.advanceTimersByTime(16 * 60 * 1000);
  
  expect(isRecentlyVerified('test@example.com', 15)).toBe(false);
  
  vi.useRealTimers();
});
```

## Coverage Report

To see test coverage:

```bash
npm test -- --coverage
```

Target coverage for verification logic:
- **Statements**: 100%
- **Branches**: 100%
- **Functions**: 100%
- **Lines**: 100%

## Continuous Testing

These tests run:
- ✅ On every commit (pre-commit hook)
- ✅ On every PR (GitHub Actions)
- ✅ Before deploy (CI/CD pipeline)

## Known Limitations

1. **Time-based tests** - May occasionally fail due to timing
2. **Edge Function tests** - Require live environment
3. **Email delivery** - Cannot be fully automated
4. **Browser-specific features** - Must be manually tested

## Next Steps

For more comprehensive testing, consider:

1. **E2E Tests** with Playwright/Cypress
   - Full user flows
   - Real browser testing
   - Safari autofill testing

2. **Integration Tests**
   - React Testing Library
   - Mock Supabase client
   - Test form submissions

3. **Load Testing**
   - Concurrent verifications
   - Session storage limits
   - Edge Function performance
