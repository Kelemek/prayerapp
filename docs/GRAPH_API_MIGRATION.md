# Microsoft Graph API Migration Plan

## Overview

Replace Resend and Mailchimp with Microsoft Graph API to consolidate email functionality using your existing M365 tenant. **No extra mailbox needed** - we'll use a single Azure AD App Registration with the appropriate permissions.

---

## What We're Replacing

### Current Setup (to be removed):
1. **Resend** (`send-notification`, `send-verification-code`)
   - Transactional emails (admin invites, verification codes)
   - Limited to test recipients without domain verification
   
2. **Mailchimp** (`send-mass-prayer-email`, `sync-mailchimp-status`)
   - Bulk emails to all subscribers
   - Subscriber management (add/remove)
   - Sync operations

### New Setup (unified):
- **Microsoft Graph API** with a single app registration
- Send as your organization (no mailbox needed with app-only permissions)
- All email types handled through one system
- Better deliverability and lower cost

---

## Architecture

### Single App Registration Approach (Recommended)

**Why no extra mailbox needed:**
- With Application-level `Mail.Send` permission, your app can send emails on behalf of ANY user in your tenant
- You specify the "from" address in each email request
- Best practice: use a shared mailbox address like `prayer@yourchurch.org` for the `from` field
  - The shared mailbox doesn't need credentials
  - It just needs to exist in your tenant
  - Graph API handles authentication via the app registration

### Permissions Required

**Application Permissions (no user sign-in needed):**
- `Mail.Send` - Send mail as any user (including shared mailboxes)
- Admin consent required

**Alternative (if tenant restricts Mail.Send):**
- `Mail.Send.Shared` - Send mail as shared mailboxes only
- More restrictive, better security posture

---

## Implementation Plan

### Phase 1: Setup Azure AD App Registration

1. **Create App Registration**
   ```
   Azure Portal → Azure Active Directory → App registrations → New registration
   Name: "Prayer App Email Service"
   Supported account types: Accounts in this organizational directory only
   Redirect URI: Not needed for app-only
   ```

2. **Create Client Secret**
   ```
   Certificates & secrets → New client secret
   Description: "Prayer App Production"
   Expires: 24 months (set calendar reminder to rotate)
   COPY THE VALUE IMMEDIATELY - you can't see it again
   ```

3. **Grant API Permissions**
   ```
   API permissions → Add a permission → Microsoft Graph
   → Application permissions → Mail.Send
   Click "Grant admin consent for [Your Org]"
   ```

4. **Store Credentials in Supabase**
   ```bash
   npx supabase link --project-ref sywegvyxztwuikbzdphr
   
   npx supabase secrets set AZURE_TENANT_ID=<your-tenant-id>
   npx supabase secrets set AZURE_CLIENT_ID=<your-app-client-id>
   npx supabase secrets set AZURE_CLIENT_SECRET=<your-client-secret>
   npx supabase secrets set MAIL_FROM_ADDRESS=prayer@yourchurch.org
   npx supabase secrets set MAIL_FROM_NAME="First Baptist Church Prayers"
   
   # Remove old secrets
   npx supabase secrets unset RESEND_API_KEY
   npx supabase secrets unset MAILCHIMP_API_KEY
   npx supabase secrets unset MAILCHIMP_SERVER_PREFIX
   npx supabase secrets unset MAILCHIMP_AUDIENCE_ID
   ```

### Phase 2: Create Unified Email Service

Create a single Edge Function that handles all email types:

**File: `supabase/functions/send-email/index.ts`**

Features:
- OAuth token caching (reuse tokens for 55 minutes)
- Automatic batching for bulk sends (respects M365 rate limits)
- Supports:
  - Single transactional emails
  - Bulk emails to subscriber list
  - HTML and text content
  - Custom reply-to addresses

### Phase 3: Migrate Email Functions

**Replace these 4 functions with 1:**

❌ Remove:
- `send-notification` (Resend-based)
- `send-verification-code` (Resend-based)
- `send-mass-prayer-email` (Mailchimp-based)
- `sync-mailchimp-status` (Mailchimp workflow)

✅ Add:
- `send-email` (Graph-based, handles all scenarios)

### Phase 4: Update Client Code

Minimal changes needed - mostly just function name updates:

```typescript
// Before (send-notification):
await supabase.functions.invoke('send-notification', {
  body: { to, subject, body, html }
})

// After (send-email):
await supabase.functions.invoke('send-email', {
  body: { 
    to,           // string or array
    subject, 
    htmlBody,     // renamed from 'html'
    textBody,     // renamed from 'body'
    replyTo       // optional
  }
})
```

### Phase 5: Remove Mailchimp Dependencies

Since Graph API can send to arbitrary recipients, we don't need Mailchimp's subscriber management:

1. **Subscriber state stays in Supabase**
   - `email_subscribers` table remains the source of truth
   - No external sync needed

2. **Bulk sends query directly from DB**
   ```typescript
   // In send-email function
   if (action === 'send_to_all_subscribers') {
     const { data } = await supabase
       .from('email_subscribers')
       .select('email')
       .eq('is_active', true)
     // Send via Graph in batches
   }
   ```

3. **Remove SyncMailchimpSubscribers component**
   - No longer needed
   - Delete from AdminPortal

---

## Key Benefits

### Cost Savings
- ❌ Resend: $20/month for 50k emails
- ❌ Mailchimp: $13+/month for basic plan
- ✅ Microsoft 365: Already included (10,000 emails/day on nonprofit plan)

### Simplification
- 1 Edge Function instead of 4
- 1 authentication system instead of 2
- 1 set of environment variables instead of 5+

### Better Deliverability
- Emails come from your verified domain
- Better DMARC/SPF/DKIM alignment
- Reduced spam flagging

### No External Service Dependencies
- No API key rotations for 3rd parties
- No rate limit coordination across services
- Unified logging and monitoring

### Security
- OAuth2 instead of API keys
- Certificate-based auth available
- Centralized access control

---

## Migration Checklist

- [ ] Phase 1: Setup App Registration
  - [ ] Create app in Azure AD
  - [ ] Create client secret
  - [ ] Grant Mail.Send permission
  - [ ] Grant admin consent
  - [ ] Store credentials in Supabase

- [ ] Phase 2: Create New Function
  - [ ] Create `supabase/functions/send-email/index.ts`
  - [ ] Implement OAuth token acquisition
  - [ ] Implement Graph sendMail calls
  - [ ] Add batching for bulk sends
  - [ ] Test locally with `supabase functions serve`

- [ ] Phase 3: Deploy and Test
  - [ ] Deploy: `npx supabase functions deploy send-email`
  - [ ] Test single email (verification code)
  - [ ] Test bulk email (prayer list to all subscribers)
  - [ ] Verify sent items appear in shared mailbox

- [ ] Phase 4: Update Client Code
  - [ ] Update verification email calls
  - [ ] Update notification email calls
  - [ ] Update bulk prayer email calls
  - [ ] Remove Mailchimp sync UI

- [ ] Phase 5: Cleanup
  - [ ] Delete old Edge Functions
  - [ ] Remove unused Supabase secrets
  - [ ] Update documentation
  - [ ] Remove Mailchimp component

---

## Rollback Plan

If Graph API doesn't work:

```bash
# Restore old functions
git checkout HEAD~1 supabase/functions/send-notification
git checkout HEAD~1 supabase/functions/send-verification-code
git checkout HEAD~1 supabase/functions/send-mass-prayer-email

# Restore secrets
npx supabase secrets set RESEND_API_KEY=<your-key>
npx supabase secrets set MAILCHIMP_API_KEY=<your-key>

# Redeploy old functions
npx supabase functions deploy send-notification
npx supabase functions deploy send-verification-code
npx supabase functions deploy send-mass-prayer-email
```

---

## Next Steps

Would you like me to:

1. ✅ **Create the unified `send-email` Edge Function** (complete Graph implementation)
2. ✅ **Update all client code** to use the new function
3. ✅ **Create migration scripts** to help with the transition
4. ✅ **Update documentation** with final setup steps

Let me know and I'll implement the complete solution!
