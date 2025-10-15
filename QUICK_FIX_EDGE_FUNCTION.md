# QUICK FIX: "Failed to send a request to the Edge Function"

## The Problem
The `send-prayer-reminders` edge function exists in your code but hasn't been deployed to Supabase yet.

## The Solution (Choose One)

### 🎯 FASTEST: Use the Deployment Script

```bash
# Run this in your terminal from the project root
./deploy-functions.sh
```

The script will:
- ✅ Check if Supabase CLI is installed
- ✅ Link to your project (asks for project ref if needed)
- ✅ Deploy the function
- ✅ Offer to deploy other functions too

---

### 🔧 MANUAL: Deploy via CLI

```bash
# 1. Install Supabase CLI (if not installed)
npm install -g supabase

# 2. Login
supabase login

# 3. Link your project
supabase link --project-ref YOUR_PROJECT_REF

# 4. Deploy the function
supabase functions deploy send-prayer-reminders
```

**Find YOUR_PROJECT_REF:**
- Supabase Dashboard → Settings → General → Reference ID
- Or from URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

---

### 🌐 ALTERNATIVE: Deploy via Dashboard

1. Go to Supabase Dashboard
2. Click **Functions** (left sidebar)
3. Click **"Create a new function"**
4. Name: `send-prayer-reminders`
5. Copy code from: `supabase/functions/send-prayer-reminders/index.ts`
6. Paste into editor
7. Click **Deploy**

---

## After Deployment

The error message will now be more helpful! Instead of:
```
Failed to send a request to the Edge Function
```

You'll see a detailed popup with:
- ✅ What the error is
- ✅ How to fix it
- ✅ Link to documentation

---

## Test It Works

1. Go to Admin Portal → Settings
2. Click "Send Reminders Now"
3. Should now show a different message:
   - If successful: "Successfully sent X reminder emails"
   - If new error: Detailed error with specific issue

---

## Common Next Errors & Fixes

### "Failed to fetch settings"
**Fix:** Apply the database migration
```sql
-- Run in Supabase SQL Editor
-- See: APPLY_REMINDER_MIGRATION.sql
```

### "Reminder emails are disabled"
**Fix:** Set interval > 0 in Settings
```
Admin Portal → Settings → Set to 7 days → Save
```

### "No prayers need reminders"
**Fix:** This is normal! It means:
- No approved prayers exist, OR
- All prayers were recently reminded, OR
- All prayers are answered/closed

---

## Verify Deployment

Check if the function was deployed:

```bash
# List all deployed functions
supabase functions list
```

Should see:
```
send-prayer-reminders
send-notification
```

Or check Supabase Dashboard → Functions

---

## Need More Help?

See the comprehensive guides:
- **DEPLOY_REMINDERS_FUNCTION.md** - Detailed deployment guide
- **DEBUG_REMINDER_ISSUE.md** - Troubleshooting all issues
- **REMINDER_EMAIL_GUIDE.md** - Complete feature documentation

---

## TL;DR

```bash
# One command to fix it all:
./deploy-functions.sh
```

Then try "Send Reminders Now" again! 🚀
