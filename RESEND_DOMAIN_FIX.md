# Resend Domain Verification Issue - SOLUTION

## The Problem
You're getting a 500 error because **Resend domain is not verified**. 

In development mode, Resend can ONLY send emails to:
- ✅ Your Resend account email
- ✅ Emails you've manually verified in Resend
- ❌ ANY other email addresses (returns 403 error)

## Quick Solutions

### Option 1: Test with Your Resend Account Email ⚡ FASTEST

Use the email address you signed up for Resend with:

1. Open User Settings in your app
2. Enter your Resend account email (the one you used to sign up for Resend)
3. Enter your name
4. Check "Receive notifications"
5. Click Save Preferences
6. **It will work!** ✅

This is the fastest way to test the verification flow right now.

### Option 2: Add Specific Test Emails 🧪 FOR TESTING

If you want to test with other specific email addresses:

1. Go to: https://resend.com/emails
2. Click "+ Add Email"
3. Enter the test email address
4. Click "Send Verification Email"
5. Check that inbox and click the verification link
6. Now you can send verification codes to that email!

### Option 3: Verify Your Domain 🚀 FOR PRODUCTION

For production use (sending to any email):

1. **Go to Resend Domains**
   - https://resend.com/domains

2. **Add Your Domain**
   - Click "+ Add Domain"
   - Enter: `prayerconnections.org` (or whatever your domain is)

3. **Add DNS Records**
   Resend will show you DNS records to add. Go to your domain provider (GoDaddy, Namecheap, etc.) and add:
   
   ```
   Type: TXT
   Name: resend._domainkey
   Value: [Resend will provide this]
   
   Type: TXT  
   Name: @
   Value: [Resend will provide this]
   
   Type: MX
   Name: @
   Value: feedback-smtp.resend.com
   Priority: 10
   ```

4. **Wait for Verification**
   - Usually takes 5-15 minutes
   - Resend will automatically check
   - You'll get an email when verified ✅

5. **Update FROM Email**
   Once verified, update your Edge Function secret:
   ```
   RESEND_FROM_EMAIL = noreply@prayerconnections.org
   ```
   
   Or with name:
   ```
   RESEND_FROM_EMAIL = Prayer App <noreply@prayerconnections.org>
   ```

6. **Redeploy**
   ```bash
   ./deploy-functions.sh send-verification-code
   ```

## Current Status

Right now your Resend is in **development mode**, which means:
- ❌ Cannot send to random email addresses
- ✅ CAN send to your Resend account email
- ✅ CAN send to emails you manually verify

## Better Error Message

I just redeployed the Edge Function with a better error message. Now when you try to add a non-verified email, you'll see:

```
Email domain not verified in Resend. 
To fix: 
1) Verify your domain at https://resend.com/domains, OR 
2) Add "[email]" as a verified email in Resend, OR 
3) Use your Resend account email for testing.
```

## Test Right Now

**Without changing anything:**

1. Open User Settings
2. Use your Resend signup email
3. Save preferences
4. Should work! ✅

Then you can test the full flow:
1. Enter verification code from email ✅
2. Submit preference change ✅
3. Admin gets notification ✅
4. Admin approves in Pending Changes ✅
5. User is subscribed! ✅

## For Production

Before going live, verify your domain so you can send to any email address. This is a one-time setup that takes about 15 minutes.

## Questions?

- **What's my Resend account email?** Check https://resend.com/settings
- **How long does verification take?** Usually 5-15 minutes after adding DNS records
- **Can I test without verifying?** Yes! Use your Resend account email or add specific test emails
- **Do I need to verify for production?** YES! Otherwise you can only send to verified emails
