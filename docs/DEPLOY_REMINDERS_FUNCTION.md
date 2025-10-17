# Deploying the Prayer Reminders Edge Function

## Error: "Failed to send a request to the Edge Function"

This error means the `send-prayer-reminders` function hasn't been deployed to Supabase yet.

---

## Option 1: Deploy via Supabase CLI (Recommended)

### Step 1: Install Supabase CLI (if not already installed)
```bash
# macOS
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase
```

### Step 2: Login to Supabase
```bash
supabase login
```

### Step 3: Link your project
```bash
# Navigate to your project directory
cd /Users/marklarson/Documents/GitHub/prayerapp

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

**To find your project ref:**
- Go to Supabase Dashboard
- Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- Or: Settings → General → Project Settings → Reference ID

### Step 4: Deploy the function
```bash
# Deploy just the reminders function
supabase functions deploy send-prayer-reminders

# Or deploy all functions at once
supabase functions deploy
```

### Step 5: Verify deployment
```bash
# List deployed functions
supabase functions list
```

You should see `send-prayer-reminders` in the list.

---

## Option 2: Deploy via Supabase Dashboard

### Step 1: Create the function in Dashboard
1. Go to Supabase Dashboard
2. Navigate to **Functions** (in left sidebar)
3. Click **"Create a new function"**
4. Name it: `send-prayer-reminders`
5. Click **"Create function"**

### Step 2: Copy the code
1. Open the file: `supabase/functions/send-prayer-reminders/index.ts`
2. Copy all the code
3. In the Dashboard, paste it into the function editor
4. Click **"Deploy"**

---

## Option 3: Manual Deployment Script

Create this bash script to deploy:

```bash
#!/bin/bash
# deploy-reminders-function.sh

echo "Deploying send-prayer-reminders function..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI not installed"
    echo "Install with: npm install -g supabase"
    exit 1
fi

# Check if linked to project
if [ ! -f ".supabase/config.toml" ]; then
    echo "Error: Not linked to a Supabase project"
    echo "Run: supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

# Deploy the function
supabase functions deploy send-prayer-reminders

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
    echo "You can now test it in the admin portal."
else
    echo "❌ Deployment failed"
    exit 1
fi
```

Run it:
```bash
chmod +x deploy-reminders-function.sh
./deploy-reminders-function.sh
```

---

## Verify Deployment

### Method 1: Check Dashboard
1. Supabase Dashboard → Functions
2. Look for `send-prayer-reminders`
3. Should show status as "Active"

### Method 2: Test with curl
```bash
curl -i --location --request POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-prayer-reminders' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

**Expected response:** 200 OK with JSON response

### Method 3: Check in app
1. Go to Admin Portal → Settings
2. Click "Send Reminders Now"
3. Should now work without the edge function error

---

## Troubleshooting Deployment

### Error: "supabase: command not found"
**Solution:** Install Supabase CLI
```bash
npm install -g supabase
```

### Error: "Not linked to a project"
**Solution:** Link your project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Error: "Authentication required"
**Solution:** Login first
```bash
supabase login
```

### Error: "Function already exists"
**Solution:** This is fine! It means the function is deployed. Just re-deploy:
```bash
supabase functions deploy send-prayer-reminders --no-verify-jwt
```

### Error: "Invalid function name"
**Solution:** Make sure the folder structure is correct:
```
supabase/
  functions/
    send-prayer-reminders/
      index.ts
```

---

## After Successful Deployment

1. ✅ The function will appear in Supabase Dashboard → Functions
2. ✅ "Send Reminders Now" button will work
3. ✅ Function can be invoked from the app
4. ✅ Function logs will appear in Dashboard

---

## Deploy Other Functions Too (Optional)

While you're at it, deploy the other functions:

```bash
# Deploy auto-transition function
supabase functions deploy auto-transition-prayers

# Deploy notification function (if not already deployed)
supabase functions deploy send-notification

# Or deploy all at once
supabase functions deploy
```

---

## Quick Start (All in One)

```bash
# 1. Install CLI (if needed)
npm install -g supabase

# 2. Login
supabase login

# 3. Link project (replace YOUR_PROJECT_REF)
supabase link --project-ref YOUR_PROJECT_REF

# 4. Deploy function
supabase functions deploy send-prayer-reminders

# 5. Verify
supabase functions list

# 6. Test in app
# Go to Admin Portal → Settings → Click "Send Reminders Now"
```

---

## Environment Variables (if needed)

If your function needs environment variables (like APP_URL):

```bash
# Set environment variable
supabase secrets set APP_URL=https://yourapp.com

# Or set multiple at once
supabase secrets set \
  APP_URL=https://yourapp.com \
  OTHER_VAR=value
```

The function will automatically have access to:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (automatically injected)

---

## Next Steps After Deployment

1. ✅ Apply database migration (APPLY_REMINDER_MIGRATION.sql)
2. ✅ Deploy edge function (this guide)
3. ✅ Configure reminder interval in Settings
4. ✅ Test with "Send Reminders Now"
5. ✅ Set up cron job for automated reminders (optional)

---

## Need Help?

If deployment still fails, share:
1. The exact error message
2. Output of `supabase --version`
3. Output of `supabase functions list`
4. Your Supabase project URL (without sensitive keys)

This will help diagnose the issue!
