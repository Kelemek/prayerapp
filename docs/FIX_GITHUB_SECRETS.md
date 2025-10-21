# Fix: Credentials Work Locally But Fail in GitHub Actions

## Problem
The NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN work when tested locally with curl, but GitHub Actions still shows "Error: Not Found"

## Root Cause
This usually means there are hidden characters (spaces, line breaks, tabs) in the GitHub Secrets.

## Solution: Re-add Secrets Carefully

### Step 1: Delete and Re-create Both Secrets

Go to: https://github.com/Kelemek/prayerapp/settings/secrets/actions

#### Delete NETLIFY_SITE_ID:
1. Click on `NETLIFY_SITE_ID`
2. Click "Remove" (bottom of the page)
3. Confirm deletion

#### Delete NETLIFY_AUTH_TOKEN:
1. Click on `NETLIFY_AUTH_TOKEN`
2. Click "Remove"
3. Confirm deletion

### Step 2: Re-add NETLIFY_SITE_ID (Carefully)

1. Click "New repository secret"
2. Name: `NETLIFY_SITE_ID`
3. Value: **Paste from Netlify, then:**
   - Press `Home` key (go to start of line)
   - Hold `Shift` and press `End` key (select all)
   - Press `Ctrl+C` or `Cmd+C` (copy selected text)
   - Delete everything
   - Paste again (`Ctrl+V` or `Cmd+V`)
   - **Visually verify** no spaces before/after
4. Click "Add secret"

### Step 3: Re-add NETLIFY_AUTH_TOKEN (Carefully)

Same process:
1. Click "New repository secret"
2. Name: `NETLIFY_AUTH_TOKEN`
3. Value: Paste token, then trim/re-paste as above
4. Click "Add secret"

### Step 4: Alternative Method - Use GitHub CLI

If you have `gh` CLI installed:

```bash
# Set NETLIFY_SITE_ID
gh secret set NETLIFY_SITE_ID --body "YOUR_SITE_ID_HERE"

# Set NETLIFY_AUTH_TOKEN
gh secret set NETLIFY_AUTH_TOKEN --body "YOUR_TOKEN_HERE"
```

This avoids any copy/paste whitespace issues.

---

## Or: Update Workflow to Trim Secrets

If the issue persists, we can modify the workflow to automatically trim whitespace:

Add this step before the Netlify deploy step in `.github/workflows/netlify-preview.yml`:

```yaml
- name: Prepare Netlify credentials
  run: |
    echo "NETLIFY_SITE_ID_CLEAN=$(echo ${{ secrets.NETLIFY_SITE_ID }} | tr -d '[:space:]')" >> $GITHUB_ENV
    echo "NETLIFY_AUTH_TOKEN_CLEAN=$(echo ${{ secrets.NETLIFY_AUTH_TOKEN }} | tr -d '[:space:]')" >> $GITHUB_ENV

- name: Deploy to Netlify Preview
  uses: nwtgck/actions-netlify@v3.0
  with:
    publish-dir: './dist'
    production-deploy: false
    github-token: ${{ secrets.GITHUB_TOKEN }}
    deploy-message: "Deploy from PR #${{ github.event.pull_request.number }}"
    alias: pr-${{ github.event.pull_request.number }}
    enable-pull-request-comment: true
    enable-commit-comment: false
    overwrites-pull-request-comment: true
  env:
    NETLIFY_AUTH_TOKEN: ${{ env.NETLIFY_AUTH_TOKEN_CLEAN }}
    NETLIFY_SITE_ID: ${{ env.NETLIFY_SITE_ID_CLEAN }}
```

---

## Quick Fix: Try Re-adding Secrets First

The fastest solution is usually just deleting and carefully re-adding the secrets.

After re-adding them, re-run the failed workflow:
1. Go to your PR
2. Click the failed check
3. Click "Re-run failed jobs"

Let me know if you want me to update the workflow file with the trimming solution!
