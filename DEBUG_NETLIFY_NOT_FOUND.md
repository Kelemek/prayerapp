# Debugging Netlify "Not Found" Error

## Issue
Getting `Error: Not Found` from Netlify deployment action on PR #2

## Checklist to Fix

### 1. Verify NETLIFY_SITE_ID Format

The Site ID MUST be:
- ✅ The UUID format with dashes: `12345678-abcd-1234-5678-123456789abc`
- ❌ NOT the site name: `cp-church-prayer`
- ❌ NOT the site URL

### 2. Double-Check You Copied the Right Field

In Netlify Dashboard at:
https://app.netlify.com/sites/cp-church-prayer/settings/general

Look for **"Project information"** section:
```
Project name: cp-church-prayer
Owner: [your name]
Project ID: abc123-def456-ghi789-jkl012  ← THIS ONE!
```

**Copy the Project ID** (the long UUID with dashes)

### 3. Verify in GitHub Secrets

Go to: https://github.com/Kelemek/prayerapp/settings/secrets/actions

Click on `NETLIFY_SITE_ID` to view (you can't see the value, but you can update it)

**Possible issues:**
- Extra spaces before/after the ID
- Accidentally copied something else
- Typo when pasting

### 4. Update the Secret

1. Click `NETLIFY_SITE_ID` in the secrets list
2. Click "Update"
3. **Carefully paste** the Project ID from Netlify (no extra spaces)
4. Click "Update secret"

### 5. Alternative: Get Site ID via Browser Console

While on your Netlify site page:
https://app.netlify.com/sites/cp-church-prayer/overview

1. Open browser DevTools (F12)
2. Go to Console tab
3. Paste this:
```javascript
// Look for site_id in the page data
console.log(window.location.pathname.split('/')[2]);
```

This should output your site name. But we need the API ID, not the site name.

### 6. Use Netlify CLI (Most Reliable)

Let me install the CLI and get the correct ID:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# List your sites
netlify sites:list

# Link to the site
netlify link --name cp-church-prayer

# Get site info (including Site ID)
netlify status
```

The output will show:
```
Site Id: abc-def-ghi-jkl-mno  ← Use this!
```

---

## Let's Get This Right

Can you:

1. Go to: https://app.netlify.com/sites/cp-church-prayer/settings/general
2. Find the **"Project information"** section
3. **Copy the entire "Project ID" value**
4. Paste it here so I can verify the format looks correct

Or if you want, I can help you install Netlify CLI to get it programmatically.
