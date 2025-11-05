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

### 2. Set Environment Variables in Supabase

Run these commands in your terminal:

```bash
# Link to church Supabase project (if not already linked)
npx supabase link --project-ref sywegvyxztwuikbzdphr

# Set SMTP credentials
npx supabase secrets set SMTP_HOST=smtp.office365.com
npx supabase secrets set SMTP_PORT=587
npx supabase secrets set SMTP_USER=your-email@yourchurch.org
npx supabase secrets set SMTP_PASS=your-app-password-here
npx supabase secrets set SMTP_FROM=your-email@yourchurch.org

# Remove old Resend key
npx supabase secrets unset RESEND_API_KEY
```

**Replace:**
- `your-email@yourchurch.org` with your actual Microsoft 365 email
- `your-app-password-here` with the app password you created

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

