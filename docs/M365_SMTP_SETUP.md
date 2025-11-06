# Microsoft 365 SMTP Setup - Quick Start

## ✅ Code Changes Complete

The Edge Function has been updated to use Microsoft 365 SMTP instead of Resend.

---

## Next Steps

### 1. Create App Password in Microsoft 365

1. Go to https://portal.office.com
2. Sign in with your church's Microsoft 365 account
3. Click your profile → "My Account" → "Security"
4. Click "Additional security verification"
5. Select "App passwords"
6. Click "Create" and name it "Prayer App"
7. **Copy the password** - you won't see it again

---

### 2. Set Environment Variables in Supabase (shared mailbox)

If you want messages to appear to come from a shared mailbox such as `prayer@yourchurch.org`, do NOT set `SMTP_USER` to the shared mailbox address unless that mailbox actually has login credentials (shared mailboxes normally do not). Instead use a licensed service account that can authenticate to SMTP and give it Send As permission on the shared mailbox.

Run these commands in your terminal (example uses a service account `service@yourchurch.org` and a shared mailbox `prayer@yourchurch.org`):

```bash
# Link to church Supabase project (if not already linked)
npx supabase link --project-ref sywegvyxztwuikbzdphr

# Set SMTP credentials (service account authenticates, mail will appear from the shared mailbox)
npx supabase secrets set SMTP_HOST=smtp.office365.com
npx supabase secrets set SMTP_PORT=587
npx supabase secrets set SMTP_USER=service@yourchurch.org
npx supabase secrets set SMTP_PASS=your-app-password-or-service-account-password
npx supabase secrets set SMTP_FROM=prayer@yourchurch.org

# Remove old Resend key (if present)
npx supabase secrets unset RESEND_API_KEY
```

Replace the example addresses/passwords with your real values. Important notes:
- `SMTP_USER` should be a licensed user (service account) that can authenticate.
- `SMTP_FROM` should be the shared mailbox address you want recipients to see (for example `prayer@yourchurch.org`).
- If the service account has MFA, create an app password only if your tenant still allows app passwords; otherwise prefer a non-MFA service account for SMTP AUTH or use Microsoft Graph (recommended).

Grant Send As permission to the service account so messages authenticated by the service account can be sent as the shared mailbox. You can do this in the Exchange admin center (Shared mailboxes → Manage mailbox delegation → Send as) or via Exchange PowerShell:

```powershell
# (after connecting with Connect-ExchangeOnline)
Add-MailboxPermission -Identity "prayer@yourchurch.org" -User "service@yourchurch.org" -AccessRights SendAs
```

If SMTP AUTH is blocked in your tenant, you'll need to use Microsoft Graph (see notes below).

---

### 3. Deploy Updated Edge Function

```bash
npx supabase functions deploy send-notification
```

---

### 4. Test the Email Function

1. Open your admin portal
2. Try sending an admin invite email
3. Check Supabase Functions logs for any errors:
   - Go to Supabase Dashboard → Edge Functions → send-notification → Logs

---

## Important Notes

### Batching for Bulk Emails
The function now automatically batches large sends:
- **30 emails per minute** (Microsoft 365 rate limit)
- **60 second delay** between batches
- For 150-200 recipients: will take 5-7 minutes total

### Sending Limits
- **Microsoft 365 Nonprofit**: 10,000 recipients/day
- Your typical use (150-200 per prayer): Well within limits

### Sender Address
Make sure the email address you use:
- ✅ Is a real mailbox (not an alias)
- ✅ Has a valid app password
- ✅ Is not marked as spam/blocked

**Recommended:** Use a dedicated shared mailbox like `prayer@yourchurch.org`

---

## Troubleshooting

### "Email service not configured" error
- Check that all SMTP environment variables are set in Supabase
- Verify the app password is correct

### "Failed to send email" error
- Check Microsoft 365 security settings
- Verify the account isn't locked or flagged
- Ensure 2FA/MFA is enabled on the account

### Emails not arriving
- Check spam folders
- Verify recipient email addresses are correct
- Check Microsoft 365 admin center for blocked sends

---

## Rollback (if needed)

If Microsoft 365 SMTP doesn't work, you can roll back:

```bash
# Restore old code from git
git checkout HEAD~1 supabase/functions/send-notification/index.ts

# Re-add Resend key
npx supabase secrets set RESEND_API_KEY=your-resend-key

# Redeploy
npx supabase functions deploy send-notification
```

---

## Questions Before Deploying

- [ ] What Microsoft 365 email will you use?
- [ ] Have you created the app password?
- [ ] Do you have access to the Supabase dashboard?
- [ ] Should reply-to address be different from sender?

