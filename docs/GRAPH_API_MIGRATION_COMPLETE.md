# Microsoft Graph API Email Migration - Implementation Complete

## What Was Implemented

The complete migration from Resend and Mailchimp to Microsoft Graph API for all email functionality.

### Files Created

1. **`supabase/functions/send-email/index.ts`** - Unified email service
   - OAuth token acquisition and caching
   - Single and bulk email sending
   - Automatic batching (30 emails/minute for M365 limits)
   - Supports both single emails and bulk sends to all subscribers

2. **`supabase/functions/send-email/deno.json`** - Deno configuration

3. **`src/lib/emailService.ts`** - Client-side TypeScript wrapper
   - `sendEmail()` - Send single or small batch emails
   - `sendEmailToAllSubscribers()` - Send to all active subscribers
   - `sendVerificationCode()` - Send verification code emails
   - Full TypeScript types and error handling

4. **`docs/GRAPH_API_MIGRATION.md`** - Comprehensive migration guide
   - Azure AD setup instructions
   - Implementation phases
   - Rollback procedures

### Files Updated

1. **`supabase/functions/send-verification-code/index.ts`**
   - Now uses Graph API via `send-email` function
   - Removed Resend dependency

2. **`src/lib/emailNotifications.ts`**
   - Updated to use new `sendEmail()` service
   - Maintained backwards compatibility with all 11 call sites
   - `sendMailchimpCampaign()` now uses `sendEmailToAllSubscribers()`

3. **`src/components/AdminUserManagement.tsx`**
   - Updated admin invitation emails to use `sendEmail()`
   - Removed dependency on old `send-notification` function

4. **`src/components/EmailSettings.tsx`**
   - Test email now uses `sendEmailToAllSubscribers()`
   - Updated UI text from "Mailchimp" to "Email Integration"

5. **`src/components/AdminPortal.tsx`**
   - Removed `SyncMailchimpSubscribers` import and component usage

### Files Removed

1. **Edge Functions (Resend-based):**
   - `supabase/functions/send-notification/` ❌
   - Old verification sender (now updated inline)

2. **Edge Functions (Mailchimp-based):**
   - `supabase/functions/send-mass-prayer-email/` ❌
   - `supabase/functions/sync-mailchimp-status/` ❌

3. **UI Components:**
   - `src/components/SyncMailchimpSubscribers.tsx` ❌

4. **GitHub Workflows:**
   - `.github/workflows/sync-mailchimp-status.yml` ❌

## Architecture

### Authentication Flow
- **OAuth2 Client Credentials** (app-only authentication)
- **Permission**: `Mail.Send` (Application-level)
- **Token Caching**: 55-minute cache with 5-minute buffer
- **No user mailbox required**: App sends as shared mailbox address

### Rate Limiting
- **Batching**: 30 emails per batch
- **Delay**: 60 seconds between batches
- **M365 Compliance**: Respects Microsoft 365 sending limits

### Environment Variables Required

```bash
# Microsoft Graph API (Azure AD)
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Email Configuration
MAIL_FROM_ADDRESS=prayer@yourchurch.org
MAIL_FROM_NAME=Prayer Ministry

# Existing Supabase (already set)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Environment Variables Removed

```bash
# No longer needed:
RESEND_API_KEY ❌
RESEND_FROM_EMAIL ❌
MAILCHIMP_API_KEY ❌
MAILCHIMP_SERVER_PREFIX ❌
MAILCHIMP_AUDIENCE_ID ❌
```

## Next Steps for Deployment

### 1. Azure AD Setup

Create Azure AD App Registration:
1. Go to https://portal.azure.com
2. Navigate to: **Azure Active Directory → App registrations**
3. Click **New registration**
   - Name: "Prayer App Email Service"
   - Supported account types: Single tenant
4. After creation, note the **Application (client) ID** and **Directory (tenant) ID**
5. Go to **Certificates & secrets**
   - Create new client secret
   - Expiry: 24 months (set calendar reminder)
   - Copy the secret value immediately
6. Go to **API permissions**
   - Add permission → Microsoft Graph → Application permissions
   - Select `Mail.Send`
   - Click **Grant admin consent**

### 2. Configure Supabase Secrets

```bash
# Set Azure credentials
npx supabase secrets set AZURE_TENANT_ID=your-tenant-id
npx supabase secrets set AZURE_CLIENT_ID=your-client-id
npx supabase secrets set AZURE_CLIENT_SECRET=your-client-secret

# Set email configuration
npx supabase secrets set MAIL_FROM_ADDRESS=prayer@yourchurch.org
npx supabase secrets set MAIL_FROM_NAME="Prayer Ministry"

# Remove old secrets (optional)
npx supabase secrets unset RESEND_API_KEY
npx supabase secrets unset RESEND_FROM_EMAIL
npx supabase secrets unset MAILCHIMP_API_KEY
npx supabase secrets unset MAILCHIMP_SERVER_PREFIX
npx supabase secrets unset MAILCHIMP_AUDIENCE_ID
```

### 3. Deploy Edge Functions

```bash
# Deploy new unified email service
npx supabase functions deploy send-email

# Deploy updated verification sender
npx supabase functions deploy send-verification-code

# Optional: Delete old functions from Supabase dashboard
# (Already deleted locally)
```

### 4. Testing Checklist

- [ ] Test single email (admin invitation)
- [ ] Test verification code email
- [ ] Test bulk email (all subscribers)
- [ ] Verify sent items appear in shared mailbox
- [ ] Check Supabase function logs for errors
- [ ] Test reply-to functionality

### 5. Monitor

After deployment, monitor:
- Supabase Edge Function logs
- Azure AD sign-in logs (for API calls)
- Email delivery in shared mailbox "Sent Items"
- Any Graph API throttling errors

## Benefits

### Consolidation
- **1 service** instead of 2 (Resend + Mailchimp)
- **1 Edge Function** instead of 4
- **Unified API** for all email operations

### Cost Savings
- **No Resend subscription** ($0/month vs $10/month)
- **No Mailchimp subscription** ($0/month vs $13+/month)
- **Microsoft 365 included** (if you already have it)

### Features
- **Better control**: Full visibility in shared mailbox
- **Professional**: Emails come from your church domain
- **Tracking**: All sent emails visible in Outlook
- **Rate limiting**: Built-in batching for bulk sends
- **Error handling**: Graceful failures, detailed logs

## Rollback Plan

If needed, the old Resend/Mailchimp functions are available in git history:

```bash
# View last commit before migration
git log --oneline

# Restore old functions if needed
git checkout <commit-hash> -- supabase/functions/send-notification
git checkout <commit-hash> -- supabase/functions/send-mass-prayer-email
git checkout <commit-hash> -- src/components/SyncMailchimpSubscribers.tsx

# Re-add old secrets
npx supabase secrets set RESEND_API_KEY=...
npx supabase secrets set MAILCHIMP_API_KEY=...

# Redeploy old functions
npx supabase functions deploy send-notification
npx supabase functions deploy send-mass-prayer-email
```

## Testing Locally

Before deploying to production, test locally:

```bash
# Start Supabase locally
npx supabase start

# Set environment variables in .env.local
# (See GRAPH_API_MIGRATION.md for details)

# Test the function
npx supabase functions serve send-email

# Send test request
curl -X POST http://localhost:54321/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "textBody": "This is a test"
  }'
```

## Support

For issues or questions:
1. Check function logs: `npx supabase functions logs send-email`
2. Review Azure AD sign-in logs for API authentication issues
3. Verify environment variables are set correctly
4. Refer to `GRAPH_API_MIGRATION.md` for detailed troubleshooting

---

**Migration completed**: [Current Date]  
**Deployed by**: [Your Name]  
**Status**: ✅ Code complete, ready for deployment
