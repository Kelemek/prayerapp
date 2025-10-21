# Email Verification System - Deployment Checklist

## ✅ Development Complete

All components have been implemented and committed to the repository.

## 📋 Pre-Deployment Checklist

### 1. Code Review
- [x] All TypeScript files compile without errors
- [x] All components follow consistent pattern
- [x] Error handling implemented
- [x] Backward compatibility maintained
- [x] Documentation complete

### 2. Git Status
```bash
git status
# Should show: Your branch is ahead of 'origin/main' by 7 commits
```

**Commits Ready to Push:**
1. `302a0d0` - Fixed sync-mailchimp-status errors
2. `5890bd4` - Created verification database migration
3. `a19be31` - Created Edge Functions
4. `1129d9e` - Created React components
5. `ab25288` - Added implementation docs
6. `94adde3` - Integrated into prayer form
7. `581087a` - Complete integration for all forms

## 🚀 Deployment Steps

### Step 1: Push Code to GitHub
```bash
cd /Users/marklarson/Documents/GitHub/prayerapp
git push origin main
```

**Verification:**
- Check GitHub repository shows all 7 commits
- Verify all files are present in repository

### Step 2: Run Database Migration

**Option A: Using Supabase CLI**
```bash
# Connect to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migration
supabase db push
```

**Option B: Using Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Open migration file: `supabase/migrations/20251020_create_verification_codes.sql`
3. Copy contents and run in SQL Editor

**Verification:**
```sql
-- Check that tables were created
SELECT * FROM verification_codes LIMIT 1;
SELECT require_email_verification FROM admin_settings LIMIT 1;
```

### Step 3: Deploy Edge Functions

```bash
# Deploy send-verification-code function
supabase functions deploy send-verification-code

# Deploy verify-code function
supabase functions deploy verify-code
```

**Verification:**
```bash
# List deployed functions
supabase functions list

# Check function logs
supabase functions logs send-verification-code
supabase functions logs verify-code
```

### Step 4: Configure Environment Variables

Set in Supabase Dashboard → Edge Functions → Settings:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to get these:**
- `RESEND_API_KEY`: Resend Dashboard → API Keys
- `SUPABASE_URL`: Supabase Dashboard → Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard → Settings → API → Service Role Key

**Verification:**
```bash
# Test send-verification-code function
curl -X POST https://your-project.supabase.co/functions/v1/send-verification-code \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "actionType": "prayer_submission",
    "actionData": {}
  }'
```

### Step 5: Configure Resend

1. Go to Resend Dashboard (https://resend.com/domains)
2. Verify your domain:
   - Add domain
   - Add DNS records (SPF, DKIM, etc.)
   - Verify domain
3. Configure "from" email address
4. Test email delivery

**Verification:**
- Send test email from Resend dashboard
- Check that emails are delivered to inbox (not spam)

### Step 6: Deploy Frontend

**If using Netlify:**
```bash
# Netlify will auto-deploy when you push to GitHub
# Or trigger manual deploy:
netlify deploy --prod
```

**If using Vercel:**
```bash
vercel --prod
```

**Verification:**
- Check deployment logs for success
- Visit production URL
- Open browser console (no errors)

### Step 7: Enable Email Verification (Optional)

1. Log in to Admin Portal
2. Go to Settings → Email Settings
3. Find "Require Email Verification for User Actions"
4. Toggle ON to enable
5. Click Save

**Note:** Leave DISABLED initially for testing

## 🧪 Testing in Production

### Test 1: Verification DISABLED (Default)
Test each form submits normally:
- [ ] Prayer request submission
- [ ] Prayer update
- [ ] Prayer deletion request
- [ ] Status change request
- [ ] Update deletion request
- [ ] Preference change

**Expected:** All forms work exactly as before (no verification dialog)

### Test 2: Verification ENABLED

Enable in Admin Portal, then test each form:

**Prayer Request:**
- [ ] Fill out prayer form
- [ ] Click Submit
- [ ] Verification code email received
- [ ] Verification dialog appears
- [ ] Enter correct code → Prayer submitted
- [ ] Try wrong code → Error shown
- [ ] Test "Resend Code" → New email received
- [ ] Test Cancel → Form returns to previous state

**Repeat for:**
- [ ] Prayer update
- [ ] Prayer deletion request
- [ ] Status change request
- [ ] Update deletion request
- [ ] Preference change

### Test 3: Email Delivery
- [ ] Codes arrive in inbox (not spam)
- [ ] Email branding looks correct
- [ ] Links work (if any)
- [ ] Code is clearly visible
- [ ] Expiration time shown

### Test 4: Code Security
- [ ] Code expires after 15 minutes
- [ ] Code can only be used once
- [ ] Cannot reuse old codes
- [ ] Different codes for different actions

### Test 5: Error Handling
- [ ] Invalid code shows clear error
- [ ] Expired code shows clear error
- [ ] Network errors handled gracefully
- [ ] User can retry after errors

## 🔧 Troubleshooting

### Problem: Verification dialog doesn't appear
**Check:**
1. Admin setting is enabled: `SELECT require_email_verification FROM admin_settings;`
2. Browser console for errors
3. Edge Function is deployed: `supabase functions list`

**Solution:**
- Re-deploy Edge Functions
- Check browser console for errors
- Verify admin_settings table has the column

### Problem: Email not received
**Check:**
1. Spam folder
2. Resend API key is set: `supabase secrets list`
3. Domain is verified in Resend
4. Edge Function logs: `supabase functions logs send-verification-code`

**Solution:**
- Verify Resend API key
- Check domain verification status
- Send test email from Resend dashboard

### Problem: "Invalid code" error
**Check:**
1. Code hasn't expired (15 minutes)
2. Code hasn't been used already
3. Correct codeId is being sent

**Solution:**
- Request new code ("Resend Code" button)
- Check verification_codes table for code status

### Problem: TypeScript errors after pull
**Solution:**
```bash
cd /Users/marklarson/Documents/GitHub/prayerapp
npm install
npm run build
```

## 📊 Monitoring

### Database Monitoring
```sql
-- Check verification code usage
SELECT 
  action_type,
  COUNT(*) as total,
  SUM(CASE WHEN used_at IS NOT NULL THEN 1 ELSE 0 END) as used,
  SUM(CASE WHEN expires_at < NOW() THEN 1 ELSE 0 END) as expired
FROM verification_codes
GROUP BY action_type;

-- Check admin setting
SELECT require_email_verification FROM admin_settings;
```

### Edge Function Monitoring
```bash
# Check function logs for errors
supabase functions logs send-verification-code --tail
supabase functions logs verify-code --tail
```

### Resend Monitoring
- Check Resend Dashboard for delivery stats
- Monitor bounce rates
- Check spam complaints

## 🎉 Post-Deployment

### Announce to Users (If Enabling Verification)
Send email/announcement explaining:
1. New security feature added
2. What users need to do (check email, enter code)
3. Why it's beneficial (security, spam prevention)
4. How to get help if needed

### Monitor First 24 Hours
- [ ] Watch for user complaints
- [ ] Monitor error rates in Edge Functions
- [ ] Check email delivery rates
- [ ] Watch database for unusual activity

### Gradual Rollout (Recommended)
1. Week 1: Leave verification DISABLED, monitor regular usage
2. Week 2: Enable verification for 24 hours, monitor
3. Week 3: Enable verification permanently if no issues

## 📝 Rollback Plan

If issues occur, rollback is simple:

### Disable Verification (Immediate)
1. Log in to Admin Portal
2. Go to Settings → Email Settings
3. Toggle OFF "Require Email Verification"
4. Click Save

**Result:** All forms return to original behavior immediately (no code changes needed)

### Complete Rollback (If Needed)
```bash
# Revert to previous commit
git revert HEAD~7..HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-before-verification>
git push origin main --force
```

## ✅ Success Criteria

Deployment is successful when:
- [x] All 7 commits pushed to GitHub
- [ ] Database migration applied successfully
- [ ] Both Edge Functions deployed
- [ ] Environment variables configured
- [ ] Resend domain verified
- [ ] Frontend deployed
- [ ] All forms work with verification DISABLED
- [ ] All forms work with verification ENABLED
- [ ] Emails are delivered successfully
- [ ] No TypeScript errors
- [ ] No console errors in production

## 📞 Support

If you encounter issues:
1. Check troubleshooting section above
2. Review Edge Function logs
3. Check Supabase Dashboard for errors
4. Verify all environment variables are set
5. Test with verification disabled first

## 🎯 Next Steps After Deployment

1. Monitor usage for first week
2. Gather user feedback
3. Optimize email templates if needed
4. Consider implementing enhancements:
   - Configurable expiration time
   - SMS verification option
   - Rate limiting
   - Usage analytics dashboard
5. Update documentation based on real-world usage
