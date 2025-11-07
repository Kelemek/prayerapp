# Switch from Resend to Microsoft 365 SMTP

## Overview
This document outlines the steps to replace Resend email functionality with Microsoft 365 SMTP for sending transactional emails (magic links, notifications, invites).

---

## Prerequisites

✅ **Required:**
- Active Microsoft 365 subscription with email account
- Microsoft 365 email address to send from (e.g., `prayer@yourchurch.org`)
- Microsoft 365 account credentials or app password

---

## Phase 1: Microsoft 365 Configuration

### Step 1: Verify Microsoft 365 Account
- [ ] Confirm you have a working Microsoft 365 email account
- [ ] Note the email address you'll use (e.g., `prayer@yourchurch.org`)

### Step 2: Enable App Password (Recommended for Security)
1. Sign in to Microsoft 365 account at https://portal.office.com
2. Go to "My Account" → "Security"
3. Click "Additional security verification"
4. Select "App passwords"
5. Create a new app password for the prayer app
6. **Save this password securely** - you won't see it again

**Alternative:** Use your regular Microsoft 365 password (less secure)

### Step 3: Note SMTP Settings
```
Host: smtp.office365.com
Port: 587
Encryption: STARTTLS
Username: your-email@yourchurch.org
Password: [app password or account password]
```

---

## Phase 2: Update Supabase Edge Function

### Step 1: Update send-notification Function
File: `supabase/functions/send-notification/index.ts`

**Current:** Uses Resend API
**New:** Will use nodemailer with Microsoft 365 SMTP

Changes needed:
1. Remove Resend import and initialization
2. Add nodemailer dependency
3. Update email sending logic to use SMTP
4. Update environment variables

### Step 2: Add nodemailer to Edge Function
Create `supabase/functions/send-notification/package.json`:
```json
{
  "dependencies": {
    "nodemailer": "^6.9.0"
  }
}
```

### Step 3: Update Environment Variables
In Supabase dashboard:
- Remove: `RESEND_API_KEY`
- Add:
  - `SMTP_HOST=smtp.office365.com`
  - `SMTP_PORT=587`
  - `SMTP_USER=your-email@yourchurch.org`
  - `SMTP_PASS=[your app password]`
  - `SMTP_FROM=your-email@yourchurch.org`

---

## Phase 3: Code Changes

### Files to Modify:

#### 1. `supabase/functions/send-notification/index.ts`
**Replace Resend with nodemailer:**
```typescript
import nodemailer from 'nodemailer';

// Create SMTP transporter
const transporter = nodemailer.createTransport({
  host: Deno.env.get('SMTP_HOST'),
  port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
  secure: false, // true for 465, false for 587
  auth: {
    user: Deno.env.get('SMTP_USER'),
    pass: Deno.env.get('SMTP_PASS'),
  },
});

// Send email function
const mailOptions = {
  from: Deno.env.get('SMTP_FROM'),
  to: recipientEmail,
  subject: emailSubject,
  text: textContent,
  html: htmlContent,
  replyTo: replyToEmail || Deno.env.get('SMTP_FROM'),
};

await transporter.sendMail(mailOptions);
```

#### 2. Update all email templates
Current templates use Resend format - ensure they work with nodemailer:
- Admin invite emails
- Magic link emails  
- Prayer approval/denial emails
- Preference change emails
- Reminder emails

---

## Phase 4: Testing Plan

### Local Testing:
1. Link local dev to church Supabase project
2. Set environment variables locally in `.env.local`:
   ```
   SMTP_HOST=smtp.office365.com
   SMTP_PORT=587
   SMTP_USER=your-email@yourchurch.org
   SMTP_PASS=your-app-password
   SMTP_FROM=your-email@yourchurch.org
   ```
3. Test each email type:
   - [ ] Admin magic link
   - [ ] Admin invite email
   - [ ] Prayer submission notification
   - [ ] Prayer approval email
   - [ ] Prayer denial email
   - [ ] Preference change email
   - [ ] Reminder emails

### Production Deployment:
1. Deploy updated Edge Function to Supabase
2. Add environment variables to production Supabase project
3. Test in production with test email addresses
4. Monitor for errors

---

## Phase 5: Deployment Steps

### Step 1: Update Supabase Secrets
```bash
# Set SMTP environment variables in Supabase
npx supabase secrets set SMTP_HOST=smtp.office365.com
npx supabase secrets set SMTP_PORT=587
npx supabase secrets set SMTP_USER=your-email@yourchurch.org
npx supabase secrets set SMTP_PASS=your-app-password
npx supabase secrets set SMTP_FROM=your-email@yourchurch.org

# Remove old Resend key
npx supabase secrets unset RESEND_API_KEY
```

### Step 2: Deploy Updated Edge Function
```bash
npx supabase functions deploy send-notification
```

### Step 3: Verify Deployment
- Check Supabase Functions logs for errors
- Send test email via admin portal
- Confirm email delivery

---

## Phase 6: Cleanup

### Remove Resend Dependencies:
- [ ] Remove Resend API key from Supabase secrets
- [ ] Remove Resend-related documentation references
- [ ] Update README with Microsoft 365 setup instructions
- [ ] Archive old Resend setup documentation

---

## Rollback Plan

If Microsoft 365 SMTP fails:
1. Restore previous Edge Function code from git
2. Re-add `RESEND_API_KEY` to Supabase secrets
3. Redeploy old Edge Function: `npx supabase functions deploy send-notification`

---

## Important Notes

### Microsoft 365 Sending Limits:
- **Free/Basic Plans:** ~300 emails/day
- **Business Plans:** ~10,000 emails/day
- Monitor usage to stay within limits

### Best Practices:
- Use app password instead of account password for security
- Enable 2FA on Microsoft 365 account
- Monitor Microsoft 365 admin center for blocked/flagged emails
- Keep app password in secure vault (not in code)

### Troubleshooting:
- If emails fail, check Supabase function logs
- Verify SMTP credentials are correct
- Check Microsoft 365 security settings (may block automated emails)
- Ensure account isn't locked or flagged for spam

---

## Timeline Estimate

- Phase 1 (M365 Setup): 30 minutes
- Phase 2 (Edge Function Update): 1 hour
- Phase 3 (Code Changes): 2 hours
- Phase 4 (Testing): 1 hour
- Phase 5 (Deployment): 30 minutes
- Phase 6 (Cleanup): 30 minutes

**Total: ~5-6 hours**

---

## Next Steps

1. Complete Phase 1 (Microsoft 365 configuration)
2. Create app password
3. Update Edge Function code
4. Test locally
5. Deploy to production
6. Monitor and verify

---

## Questions to Answer Before Starting

- [ ] What Microsoft 365 email address will be used?
- [ ] Is the Microsoft 365 account already set up?
- [ ] Do you have admin access to Microsoft 365 admin center?
- [ ] What is the church's domain name?
- [ ] Should reply-to address be different from sender?

