# Netlify Setup Guide - Fixing "Not Found" Error

## The Problem
The workflow shows: `Error: Not Found`

This means the `NETLIFY_SITE_ID` secret is incorrect or the site doesn't exist in your Netlify account.

## Solution: Get the Correct Site ID

### Option 1: Find Existing Site ID

1. **Go to Netlify Dashboard**: https://app.netlify.com/
2. **Click on your site** (the one where you deployed prayerapp)
3. **Go to**: Site Settings → General → Site Information
4. **Copy the "API ID"** - looks like: `abc12345-def6-7890-ghij-klmnopqrstuv`
   - ⚠️ **NOT the "Site ID"** (which is just the name)
   - ✅ **YES the "API ID"** (long UUID format)

### Option 2: Create a New Site

If you haven't deployed to Netlify yet:

1. **Go to**: https://app.netlify.com/
2. **Click**: "Add new site" → "Import an existing project"
3. **Select**: GitHub
4. **Choose**: Kelemek/prayerapp repository
5. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Base directory: (leave empty)
6. **Add environment variables** (important!):
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
7. **Click**: "Deploy site"
8. **After deployment**, go to Site Settings → General → API ID
9. **Copy that API ID**

### Option 3: Use Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to existing site OR create new one
netlify link

# OR create a new site
netlify sites:create --name prayerapp

# Get the site ID
netlify status
# Look for "Site Id:" in the output
```

---

## Update GitHub Secret

1. **Go to GitHub**: https://github.com/Kelemek/prayerapp/settings/secrets/actions
2. **Find**: `NETLIFY_SITE_ID`
3. **Click**: The pencil icon to edit
4. **Replace** with the correct API ID you just copied
5. **Click**: "Update secret"

---

## Get NETLIFY_AUTH_TOKEN (Personal Access Token)

If you also need to verify/update your auth token:

1. **Go to**: https://app.netlify.com/user/applications
2. **Scroll to**: "Personal access tokens"
3. **Click**: "New access token"
4. **Description**: `GitHub Actions - prayerapp`
5. **Click**: "Generate token"
6. **Copy the token** (you won't see it again!)
7. **Update in GitHub**: https://github.com/Kelemek/prayerapp/settings/secrets/actions

---

## Verify All Secrets Are Correct

You need these 4 secrets in GitHub:

| Secret Name | Where to Find |
|-------------|---------------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → Project API keys → anon public |
| `NETLIFY_AUTH_TOKEN` | Netlify → User Settings → Applications → Personal access tokens |
| `NETLIFY_SITE_ID` | Netlify → Site Settings → General → Site Information → **API ID** ⚠️ |

---

## Re-run the Workflow

After updating the secret:

### Option 1: Re-run Failed Jobs (Easiest)
1. Go to your PR: https://github.com/Kelemek/prayerapp/pull/1
2. Click on the failed "Netlify Preview Deployment" check
3. Click "Re-run failed jobs" button

### Option 2: Push a New Commit
```bash
# Make a small change
echo "" >> backups/README.md
git add backups/README.md
git commit -m "test: Trigger workflow re-run"
git push
```

### Option 3: Close and Re-open PR
1. Scroll down on the PR page
2. Click "Close pull request"
3. Click "Reopen pull request"
4. Workflows will re-run automatically

---

## Expected Success Output

After fixing, you should see:

```
✓ Deploy to Netlify Preview
  Deploy succeeded!
  Preview URL: https://pr-1--your-site.netlify.app
```

And a bot comment with the preview URL! 🎉
