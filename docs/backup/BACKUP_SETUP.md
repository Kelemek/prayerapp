# Database Backup Setup

This repository includes automated daily backups of the Supabase database using GitHub Actions with the API method.

## Setup Instructions

### 1. Get Your Supabase Credentials

You'll need the following information from your Supabase project:

1. **Project URL**: Found in your Supabase project settings
   - Format: `https://xxxxxxxxxxxxx.supabase.co`
   - Example: `https://eqiafsygvfaifhoaewxi.supabase.co`

2. **Service Role Key**: Found in Supabase Dashboard → Settings → API
   - Copy the `service_role` key (not the `anon` key)
   - Starts with `eyJ...`

### 2. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these two secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://eqiafsygvfaifhoaewxi.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key from API settings | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### 3. Enable Actions (if needed)

- Go to your repository → Actions
- If Actions are disabled, click "I understand my workflows, go ahead and enable them"

### 4. Verify Backup Works

**Option 1: Wait for scheduled run**
- The backup runs automatically at 2 AM UTC daily
- Check the Actions tab to see the results

**Option 2: Trigger manually**
- Go to Actions → "Daily Database Backup (API Method)"
- Click "Run workflow" → "Run workflow"
- This will create a backup immediately

## Backup Details

### What Gets Backed Up

- ✅ All table data from your database
- ✅ 10 tables: prayers, prayer_updates, prayer_prompts, prayer_types, email_subscribers, user_preferences, status_change_requests, update_deletion_requests, admin_settings, analytics

### What Doesn't Get Backed Up

- ⚠️ Database schema (table definitions, indexes, constraints) - tracked in migrations
- ⚠️ Functions and triggers - tracked in migrations
- ⚠️ Row Level Security (RLS) policies - tracked in migrations
- ❌ Storage files (uploaded images, documents, etc.)
- ❌ Auth users (managed separately by Supabase)
- ❌ Realtime subscriptions

**Note**: Schema is not backed up because it should be version-controlled in your migrations folder.

### Backup Schedule

- **Frequency**: Daily at 2 AM CST (8 AM UTC)
- **Retention**: 30 days
- **Storage**: GitHub Actions Artifacts (not in repository)

### Backup Location

Backups are stored as **GitHub Actions Artifacts** (not committed to the repository):

**To access backups:**
1. Go to **Actions** tab
2. Click **"Daily Database Backup (API Method)"**
3. Click any successful workflow run
4. Scroll to **Artifacts** section
5. Download `database-backup-YYYY-MM-DD_HH-MM-SS.zip`

**File format:**
```
database-backup-2025-10-18_02-00-00.zip
  ├── backup_2025-10-18_02-00-00.json.gz
  └── backup_2025-10-18_02-00-00_summary.json
```

## Restoring from Backup

### Using the Restore Script (Recommended)

1. Make sure you have the required environment variables:
```bash
# Add to your .env file
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

2. Run the restore script:
```bash
./scripts/restore-database-json.sh
```

3. Follow the prompts to select a backup file

### Manual Restore (Advanced)

If you prefer to restore manually:

1. Install dependencies: `npm install @supabase/supabase-js`
2. Decompress the backup: `gunzip backups/backup_*.json.gz`
3. Write a custom Node.js script to read the JSON and insert into Supabase
4. Use the service role key for authentication

### Using GitHub Actions Artifact

1. Go to Actions → "Daily Database Backup (API Method)" → Select a workflow run
2. Download the artifact (backup file)
3. Follow the restore script method above

## Customization

### Change Backup Schedule

Edit `.github/workflows/backup-database.yml`:

```yaml
on:
  schedule:
    # Change the cron expression
    # Format: minute hour day month weekday
    # Examples:
    # - '0 2 * * *'     # Daily at 2 AM UTC
    # - '0 */6 * * *'   # Every 6 hours
    # - '0 0 * * 0'     # Weekly on Sunday at midnight
    - cron: '0 2 * * *'
```

### Change Retention Period

Edit the "Keep only last 30 backups" step:

```yaml
# Keep last 7 days instead of 30
ls -t backup_*.sql.gz | tail -n +8 | xargs -r rm
```

### Add Storage Backup

To also backup Supabase Storage files, add this step to the workflow:

```yaml
- name: Backup Storage
  run: |
    # Use Supabase CLI to download storage buckets
    supabase storage download --project-ref ${{ secrets.SUPABASE_PROJECT_ID }}
```

## Troubleshooting

### Backup fails with "permission denied"

- Verify your `SUPABASE_DB_PASSWORD` is correct
- Check that you're using the database password, not the service role key

### Backup file is empty

- Check the workflow logs for errors
- Verify all secrets are set correctly
- Make sure your database has data to backup

### Git push fails

- The repository needs write permissions for Actions
- Go to Settings → Actions → General → Workflow permissions
- Select "Read and write permissions"

### Too many backups in repository

- Adjust the retention number in the cleanup step
- Consider using a separate repository for backups
- Use only artifacts (remove the commit/push steps)

## Security Notes

⚠️ **Important Security Considerations:**

1. **Private Repository**: Keep this repository PRIVATE as backups contain your database data
2. **Secrets**: Never commit credentials directly to code
3. **Access Control**: Limit who has access to this repository
4. **Encryption**: Consider encrypting backups before committing (advanced)

## Alternative Backup Storage

Instead of committing to the repository, you can push backups to:

- **AWS S3**: Use `aws-actions/configure-aws-credentials`
- **Google Cloud Storage**: Use `google-github-actions/upload-cloud-storage`
- **Azure Blob Storage**: Use `azure/CLI` action
- **Separate Private Repo**: Create a dedicated backups repository

## Support

For issues specific to:
- **Supabase**: Check [Supabase Docs](https://supabase.com/docs)
- **GitHub Actions**: Check [Actions Docs](https://docs.github.com/en/actions)
- **PostgreSQL**: Check [PostgreSQL Docs](https://www.postgresql.org/docs/)
