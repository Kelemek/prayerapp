# Graph API Migration - COMPLETE ✅

## Migration Summary

Successfully migrated from Resend + Mailchimp to Microsoft Graph API for all email functionality.

**Date Completed:** November 5, 2025

---

## What Was Changed

### ✅ New Files Created

1. **`supabase/functions/send-email/index.ts`**
   - Unified email service using Microsoft Graph API
   - Handles single emails and bulk sends
   - OAuth token caching for performance
   - Automatic batching (30 emails/minute for M365 limits)

2. **`src/lib/emailService.ts`**
   - Client-side wrapper for email functions
   - Type-safe interfaces
   - Backwards-compatible error handling

3. **`docs/GRAPH_API_MIGRATION.md`**
   - Complete migration guide
   - Setup instructions
   - Architecture documentation

### ❌ Files Removed

1. **Edge Functions (Old)**
   - `supabase/functions/send-notification/` (Resend-based)
   - `supabase/functions/send-mass-prayer-email/` (Mailchimp-based)
   - `supabase/functions/sync-mailchimp-status/` (Mailchimp workflow)

2. **UI Components**
   - `src/components/SyncMailchimpSubscribers.tsx` (no longer needed)

3. **Workflows**
   - `.github/workflows/sync-mailchimp-status.yml`

### 📝 Files Updated

1. **`supabase/functions/send-verification-code/index.ts`**
   - Now uses Graph API via `emailService`
   - Removed Resend dependencies

2. **`src/lib/emailNotifications.ts`**
   - Updated to use new `emailService`
   - Renamed `sendMailchimpCampaign` → `sendBulkPrayerEmail`
   - All Resend/Mailchimp references removed

3. **`src/components/AdminPortal.tsx`**
   - Removed `SyncMailchimpSubscribers` import and usage

4. **`src/components/AdminUserManagement.tsx`**
   - Updated to use `emailService.sendEmail()`

5. **`src/components/EmailSettings.tsx`**
   - Updated UI text (removed Mailchimp references)
   - Uses `emailService.sendEmailToAllSubscribers()`

6. **`docs/EMAIL.md`**
   - Updated to reflect Graph API setup
   - Removed Resend instructions
   - Added Azure AD setup references

7. **`docs/M365_SMTP_SETUP.md`**
   - Updated for shared mailbox scenarios
   - Clarified service account requirements

---

## Next Steps for Deployment

### 1. Create Azure AD App Registration

```bash
# In Azure Portal:
# 1. Azure Active Directory → App registrations → New registration
#    Name: "Prayer App Email Service"
#
# 2. Certificates & secrets → New client secret
#    Copy the secret value immediately
#
# 3. API permissions → Add permission → Microsoft Graph
#    → Application permissions → Mail.Send
#    → Grant admin consent
```

### 2. Set Supabase Secrets

```bash
npx supabase link --project-ref sywegvyxztwuikbzdphr

# Set new Graph API credentials
npx supabase secrets set AZURE_TENANT_ID=<your-tenant-id>
npx supabase secrets set AZURE_CLIENT_ID=<your-app-client-id>
npx supabase secrets set AZURE_CLIENT_SECRET=<your-client-secret>
npx supabase secrets set MAIL_FROM_ADDRESS=prayer@yourchurch.org
npx supabase secrets set MAIL_FROM_NAME="First Baptist Church Prayers"

# Remove old credentials
npx supabase secrets unset RESEND_API_KEY
npx supabase secrets unset MAILCHIMP_API_KEY
npx supabase secrets unset MAILCHIMP_SERVER_PREFIX
npx supabase secrets unset MAILCHIMP_AUDIENCE_ID
```

### 3. Deploy New Edge Functions

```bash
# Deploy the unified email function
npx supabase functions deploy send-email

# Deploy updated verification function
npx supabase functions deploy send-verification-code

# Remove old functions from Supabase Dashboard
# (or they'll be automatically cleaned up on next deployment)
```

### 4. Test the System

1. **Test verification email:**
   - Submit a new prayer request
   - Verify you receive the verification code email

2. **Test admin notification:**
   - Approve a prayer request
   - Check admin emails receive notification

3. **Test bulk email:**
   - In Admin Portal → Email Settings
   - Set distribution to "All Users"
   - Click "Send Test Email"
   - Verify all active subscribers receive it

---

## Benefits Achieved

### Cost Savings
- ❌ **Before:** Resend ($20/mo) + Mailchimp ($13/mo) = **$33/month**
- ✅ **After:** Microsoft 365 (already included) = **$0/month**
- 💰 **Annual Savings:** $396/year

### Simplification
- **Edge Functions:** 4 → 2 (50% reduction)
- **Dependencies:** 2 external services → 0
- **Environment Variables:** 5 secrets → 5 secrets (but all Microsoft)

### Reliability
- ✅ Single authentication system (Azure AD)
- ✅ Better deliverability (emails from verified church domain)
- ✅ 10,000 emails/day limit (more than sufficient)
- ✅ Unified logging and monitoring

### Security
- ✅ OAuth2 with Azure AD (vs API keys)
- ✅ Certificate-based auth available
- ✅ Centralized access control
- ✅ No third-party API keys to manage

---

## Rollback Plan (if needed)

```bash
# Restore old functions from git
git checkout HEAD~1 supabase/functions/send-notification
git checkout HEAD~1 supabase/functions/send-mass-prayer-email
git checkout HEAD~1 supabase/functions/sync-mailchimp-status

# Restore old dependencies
git checkout HEAD~1 src/lib/emailNotifications.ts
git checkout HEAD~1 src/components/SyncMailchimpSubscribers.tsx
git checkout HEAD~1 src/components/AdminPortal.tsx

# Restore secrets
npx supabase secrets set RESEND_API_KEY=<old-key>
npx supabase secrets set MAILCHIMP_API_KEY=<old-key>

# Redeploy old functions
npx supabase functions deploy send-notification
npx supabase functions deploy send-mass-prayer-email
```

---

## Verification Checklist

After deployment, verify:

- [ ] Verification code emails arrive promptly
- [ ] Admin notification emails are received
- [ ] Bulk emails to all subscribers work
- [ ] Reply-to address is correct
- [ ] Sent items appear in shared mailbox
- [ ] No errors in Supabase Edge Function logs
- [ ] Email deliverability is good (check spam folders)

---

## Support

For issues:
1. Check Supabase Edge Function logs
2. Verify Azure AD app permissions
3. Confirm secrets are set correctly
4. Review [GRAPH_API_MIGRATION.md](./GRAPH_API_MIGRATION.md)

---

**Migration Status:** ✅ COMPLETE - Ready for deployment
