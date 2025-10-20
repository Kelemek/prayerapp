# Mailchimp Unsubscribe Sync - GitHub Actions

## Overview
Automatically syncs Mailchimp unsubscribe status to your database daily. If someone unsubscribes via Mailchimp (not through your app), their `email_subscribers.is_active` field will be updated to `false`.

## Components

### 1. Edge Function: `sync-mailchimp-status`
**Location:** `supabase/functions/sync-mailchimp-status/index.ts`

**What it does:**
- Fetches all members from Mailchimp audience (up to 1,000)
- Fetches all subscribers from `email_subscribers` table
- Compares `is_active` (database) with `status` (Mailchimp)
- Updates database where they differ
- Returns statistics: updated count, skipped count, total checked

**Status Mapping:**
- Mailchimp `subscribed` → Database `is_active = true`
- Mailchimp `unsubscribed` → Database `is_active = false`
- Mailchimp `cleaned` → Database `is_active = false`
- Mailchimp `pending` → Database `is_active = false`

### 2. GitHub Actions Workflow
**Location:** `.github/workflows/sync-mailchimp-status.yml`

**Triggers:**
- **Scheduled:** Daily at 2 AM UTC (6 PM PST / 7 PM PDT)
- **Manual:** Can be triggered from GitHub Actions tab

**What it does:**
- Calls the `sync-mailchimp-status` Edge Function
- Parses the response
- Shows sync statistics in logs
- Lists all changed emails
- Fails the workflow if sync fails

## Setup

### 1. Deploy the Edge Function

```bash
cd /Users/marklarson/Documents/GitHub/prayerapp

# Deploy the sync function
supabase functions deploy sync-mailchimp-status
```

### 2. Verify GitHub Secret

The workflow needs `SUPABASE_ANON_KEY` secret in your GitHub repository:

1. Go to: https://github.com/Kelemek/prayerapp/settings/secrets/actions
2. Verify `SUPABASE_ANON_KEY` exists
3. If not, add it with your Supabase anon key

### 3. Test the Workflow

#### Option A: Manual Trigger
1. Go to: https://github.com/Kelemek/prayerapp/actions
2. Click "Sync Mailchimp Unsubscribes to Database"
3. Click "Run workflow" → "Run workflow"
4. Wait for completion and check logs

#### Option B: Test Locally
```bash
curl -X POST \
  "https://eqiafsygvfaifhoaewxi.supabase.co/functions/v1/sync-mailchimp-status" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "updated": 0,
  "skipped": 2,
  "total": 2,
  "changes": [],
  "message": "Synced 0 subscriber status changes from Mailchimp"
}
```

## How It Works

### Daily Sync Process

1. **2 AM UTC every day**, GitHub Actions triggers the workflow
2. Workflow calls your Edge Function
3. Edge Function:
   - Fetches Mailchimp members
   - Fetches database subscribers
   - Compares status for each email
   - Updates database where needed
4. Workflow logs show:
   ```
   ✅ Sync completed successfully!
   📈 Statistics:
      - Updated: 1 subscribers
      - Total checked: 3 subscribers
   📝 Changes:
      - user@example.com: unsubscribed
   ```

### What Gets Synced

**Example Scenario:**
- User unsubscribes via Mailchimp
- Status in Mailchimp: `unsubscribed`
- Status in your DB: `is_active = true`
- **Next sync:** Database updated to `is_active = false`

### What Doesn't Get Synced

- New emails in database but not in Mailchimp (these will be synced on next approval)
- Emails in Mailchimp but not in database (Mailchimp is source of truth for audience)

## Monitoring

### Check Sync History

1. Go to GitHub → Actions
2. Click on "Sync Mailchimp Unsubscribes to Database"
3. See all past runs with timestamps and results

### Check Logs

Click on any workflow run to see:
- Which emails were updated
- Old status vs new status
- Total subscribers checked
- Any errors

### Manual Trigger

If you need to sync immediately:
1. GitHub → Actions
2. Select the workflow
3. Click "Run workflow"
4. Click green "Run workflow" button

## Benefits

✅ **Automatic Sync** - Runs daily without manual intervention  
✅ **Two-Way Respect** - Honors unsubscribes from both platforms  
✅ **Audit Trail** - GitHub Actions logs every sync  
✅ **Error Handling** - Workflow fails visibly if sync fails  
✅ **Manual Override** - Can trigger sync anytime  
✅ **Scalable** - Handles up to 1,000 subscribers (configurable)  

## Troubleshooting

### Sync Failed
Check workflow logs for errors:
- ❌ Missing environment variables → Check Supabase secrets
- ❌ Mailchimp API error → Check API key, audience ID
- ❌ Database connection error → Check SUPABASE_URL and service role key

### No Updates Detected
This is normal if:
- All subscribers are already in sync
- No one has unsubscribed via Mailchimp
- Check Mailchimp dashboard to verify actual status

### Workflow Doesn't Run
1. Check if GitHub Actions is enabled for your repo
2. Verify the workflow file is in `.github/workflows/`
3. Check the cron schedule syntax
4. Manually trigger to test

## Customization

### Change Sync Schedule

Edit `.github/workflows/sync-mailchimp-status.yml`:

```yaml
schedule:
  - cron: '0 2 * * *'  # Daily at 2 AM UTC
  # Or:
  - cron: '0 */6 * * *'  # Every 6 hours
  - cron: '0 12 * * 1'  # Weekly on Monday at noon
```

### Increase Member Limit

Edit `supabase/functions/sync-mailchimp-status/index.ts`:

```typescript
const mailchimpUrl = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members?count=1000`
// Change to:
const mailchimpUrl = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members?count=5000`
```

## Files Created

1. `.github/workflows/sync-mailchimp-status.yml` - GitHub Actions workflow
2. `supabase/functions/sync-mailchimp-status/index.ts` - Edge Function
3. `MAILCHIMP_SYNC_SETUP.md` - This documentation

Your Mailchimp and database will now stay in sync automatically! 🎉
