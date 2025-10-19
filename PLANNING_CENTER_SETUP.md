# Planning Center Integration Setup Guide

## Prerequisites
- Planning Center account
- Supabase project set up
- Supabase CLI installed (optional)

## Step 1: Get Planning Center API Credentials

1. Visit the Planning Center Developer Portal:
   ```
   https://api.planningcenteronline.com/oauth/applications
   ```

2. Log in with your Planning Center account

3. Create a new Personal Access Token or Application:
   - Click "New Personal Access Token"
   - Name: "Prayer App"
   - Description: "Prayer request management with email lookup"

4. Copy your credentials:
   - **Application ID**: (looks like a long alphanumeric string)
   - **Secret**: (another long alphanumeric string)
   
   ⚠️ **Save these somewhere safe!** You won't be able to see the secret again.

## Step 2: Configure Supabase Edge Function Secrets

### Option A: Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "Edge Functions" in the left sidebar
4. Click "Manage secrets" or go to Settings
5. Add two secrets:
   - Name: `PLANNING_CENTER_APP_ID`
     Value: [Your Application ID]
   - Name: `PLANNING_CENTER_SECRET`
     Value: [Your Secret]
6. Click Save

### Option B: Supabase CLI

If you have the CLI installed:

```bash
# Navigate to your project directory
cd /Users/marklarson/Documents/GitHub/prayerapp

# Set the secrets
supabase secrets set PLANNING_CENTER_APP_ID="paste-your-app-id-here"
supabase secrets set PLANNING_CENTER_SECRET="paste-your-secret-here"
```

### Option C: Manual .env File (Local Development Only)

For local testing, create a `.env` file in `supabase/functions/`:

```bash
# supabase/functions/.env
PLANNING_CENTER_APP_ID=your-app-id-here
PLANNING_CENTER_SECRET=your-secret-here
```

⚠️ **Never commit this file to git!** (It's already in .gitignore)

## Step 3: Deploy the Edge Function

Deploy the Planning Center lookup function to Supabase:

```bash
supabase functions deploy planning-center-lookup
```

You should see output like:
```
Deploying function planning-center-lookup...
Function deployed successfully
```

## Step 4: Test the Integration

### Test using curl:

```bash
curl -X POST \
  https://YOUR-PROJECT-REF.supabase.co/functions/v1/planning-center-lookup \
  -H "Authorization: Bearer YOUR-ANON-KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Replace:
- `YOUR-PROJECT-REF` with your Supabase project reference
- `YOUR-ANON-KEY` with your Supabase anon key (found in Project Settings > API)

### Test in the app:

Once deployed, the email lookup will be available in the prayer form. Type an email address and it will search Planning Center automatically.

## Troubleshooting

### Error: "Planning Center credentials not configured"
- Make sure you've set both `PLANNING_CENTER_APP_ID` and `PLANNING_CENTER_SECRET`
- Redeploy the function after setting secrets

### Error: "Unauthorized" or 401
- Check that your Application ID and Secret are correct
- Make sure you copied them exactly (no extra spaces)

### Error: "Function not found"
- Make sure you deployed the function: `supabase functions deploy planning-center-lookup`

### No results returned
- The email must match exactly in Planning Center
- Try searching with a known email from your Planning Center database
- Check Planning Center permissions - make sure your token has access to People data

## What Gets Searched?

The integration searches Planning Center's People database for:
- Exact email matches
- Partial name matches
- Returns up to 5 results

## Next Steps

After setup is complete, you can:
1. Use email lookup in the prayer request form
2. Auto-fill requester information from Planning Center
3. Track which prayers are linked to PC people

## Security Notes

- API credentials are stored securely in Supabase Edge Functions (server-side)
- Never expose your Application ID and Secret in client-side code
- The edge function handles all API calls to keep credentials secure
