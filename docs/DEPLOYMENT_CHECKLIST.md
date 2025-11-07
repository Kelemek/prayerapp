# Graph API Email Deployment Checklist

## ✅ What You've Done
- [x] Deployed send-email Edge Function

## 🔧 Required: Set Environment Variables

The send-email function needs these Azure AD credentials to work:

```bash
# Link to your Supabase project (if not already linked)
npx supabase link --project-ref sywegvyxztwuikbzdphr

# Set Azure AD credentials
npx supabase secrets set AZURE_TENANT_ID=your-tenant-id
npx supabase secrets set AZURE_CLIENT_ID=your-app-client-id
npx supabase secrets set AZURE_CLIENT_SECRET=your-client-secret
npx supabase secrets set MAIL_FROM_ADDRESS=prayer@yourchurch.org
npx supabase secrets set MAIL_FROM_NAME="First Baptist Church Prayers"

# These should already be set (Supabase provides them)
# But verify they exist:
npx supabase secrets list
```

### Get Azure AD Credentials

If you haven't created the Azure AD App Registration yet:

1. **Go to Azure Portal**
   - https://portal.azure.com
   - Azure Active Directory → App registrations → New registration

2. **Create App**
   - Name: "Prayer App Email Service"
   - Supported account types: Single tenant
   - No redirect URI needed

3. **Get IDs**
   - Overview page shows:
     - Application (client) ID ← `AZURE_CLIENT_ID`
     - Directory (tenant) ID ← `AZURE_TENANT_ID`

4. **Create Secret**
   - Certificates & secrets → New client secret
   - Description: "Production"
   - Copy the VALUE (not the ID) ← `AZURE_CLIENT_SECRET`
   - ⚠️ **Copy it now** - you can't see it again!

5. **Grant Permissions**
   - API permissions → Add a permission
   - Microsoft Graph → Application permissions
   - Select `Mail.Send`
   - Click "Grant admin consent for [Your Org]"
   - Status should show ✅ green checkmark

## 🧪 Test Prayer Submission

After setting the environment variables:

1. Open your app: http://localhost:5174 (or your production URL)
2. Click "Add Prayer Request"
3. Fill out the form
4. Submit

### If It Works ✅
- You should receive a verification code email
- Email will come from your configured `MAIL_FROM_ADDRESS`
- Check Supabase Functions logs to see success messages

### If It Fails ❌

Check Supabase Edge Function logs:
1. Go to Supabase Dashboard
2. Edge Functions → send-email → Logs
3. Look for error messages

Common issues:
- **"Missing required environment variables"**
  - Run `npx supabase secrets list` to verify all are set
  
- **"Failed to acquire token"**
  - Check AZURE_TENANT_ID, CLIENT_ID, CLIENT_SECRET are correct
  - Verify client secret hasn't expired
  
- **"Insufficient privileges"**
  - Grant admin consent for Mail.Send permission in Azure portal
  
- **"Mailbox not found"**
  - Check MAIL_FROM_ADDRESS exists in your M365 tenant
  - Create the shared mailbox if needed

## 📝 Quick Test Command

Test the email function directly:

```bash
# Test verification email
curl -X POST https://sywegvyxztwuikbzdphr.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "subject": "Test Email",
    "htmlBody": "<p>This is a test</p>",
    "textBody": "This is a test"
  }'
```

Expected response:
```json
{
  "success": true,
  "messagesSent": 1
}
```

## 🎯 Next Steps

Once prayer submission works:

1. ✅ Commit and push all code changes
2. ✅ Remove old Resend/Mailchimp API keys from Supabase secrets
3. ✅ Test bulk email sending (send to all subscribers)
4. ✅ Update production deployment

## 🔄 Rollback (if needed)

If Graph API doesn't work and you need to go back:

```bash
# This won't work - old functions are deleted
# You'd need to restore from git history

# Better: Fix the Graph API setup instead!
```
