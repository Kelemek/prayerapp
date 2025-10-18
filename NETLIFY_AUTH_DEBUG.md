# Netlify "Not Found" - Advanced Troubleshooting

## If Site ID is Correct But Still Failing

The error could be:
1. **NETLIFY_AUTH_TOKEN** is invalid or expired
2. **NETLIFY_AUTH_TOKEN** doesn't have permission to access the site
3. The site belongs to a different Netlify account/team

## Test: Verify Auth Token Works

Let's manually test if your auth token can access the site:

### Step 1: Get Your Current Secrets (for testing)

You need to temporarily copy your secrets to test locally:
- `NETLIFY_AUTH_TOKEN` - from GitHub Secrets
- `NETLIFY_SITE_ID` - from GitHub Secrets

### Step 2: Test with curl

```bash
# Replace YOUR_AUTH_TOKEN and YOUR_SITE_ID with actual values
curl -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  https://api.netlify.com/api/v1/sites/YOUR_SITE_ID

# If successful, you'll get JSON with site info
# If failed, you'll get error details
```

Expected success:
```json
{
  "id": "abc-def-ghi",
  "name": "cp-church-prayer",
  "url": "https://cp-church-prayer.netlify.app",
  ...
}
```

Expected failure if auth token is wrong:
```json
{
  "code": 401,
  "message": "Unauthorized"
}
```

Expected failure if site ID is wrong:
```json
{
  "code": 404,
  "message": "Not found"
}
```

---

## Solution: Create a NEW Personal Access Token

The token might be expired or have wrong permissions.

### 1. Create New Token in Netlify

1. Go to: https://app.netlify.com/user/applications
2. Scroll to **"Personal access tokens"**
3. Click **"New access token"**
4. Description: `GitHub Actions prayerapp - Oct 2025`
5. Click **"Generate token"**
6. **COPY THE TOKEN** (you won't see it again!)

### 2. Update GitHub Secret

1. Go to: https://github.com/Kelemek/prayerapp/settings/secrets/actions
2. Click `NETLIFY_AUTH_TOKEN`
3. Click "Update"
4. Paste the NEW token
5. Save

### 3. Verify Site Ownership

Make sure:
- You're logged into Netlify with the account that owns `cp-church-prayer`
- The site exists at: https://app.netlify.com/sites/cp-church-prayer
- You can see and access this site in your Netlify dashboard

---

## Alternative: Site Might Be in a Team

If the site belongs to a Netlify **Team** (not your personal account):

1. Go to: https://app.netlify.com/teams
2. Check which team owns `cp-church-prayer`
3. If it's a team site:
   - The personal access token must be created while viewing that **team's context**
   - Or use a team-level token

---

## Quick Test (Without Exposing Secrets)

Let me create a test script you can run locally:
