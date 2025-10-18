# Database Backup Setup

This repository includes automated daily backups of the Supabase database using GitHub Actions.

## Setup Instructions

### 1. Get Your Supabase Credentials

You'll need the following information from your Supabase project:

1. **Project URL**: Found in your Supabase project settings
   - Format: `https://xxxxxxxxxxxxx.supabase.co`

2. **Project ID**: The part before `.supabase.co` in your URL
   - Example: If URL is `https://abcd1234efgh.supabase.co`, then ID is `abcd1234efgh`

3. **Database Password**: Your database password (set when you created the project)
   - Go to Supabase Dashboard → Settings → Database
   - Look for "Connection string" or reset your password if needed

4. **Service Role Key**: Found in Supabase Dashboard → Settings → API
   - Copy the `service_role` key (not the `anon` key)

### 2. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these four secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://abcd1234efgh.supabase.co` |
| `SUPABASE_PROJECT_ID` | Project ID from URL | `abcd1234efgh` |
| `SUPABASE_DB_PASSWORD` | Your database password | `your-secure-password` |
| `SUPABASE_SERVICE_KEY` | Service role key from API settings | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### 3. Enable Actions (if needed)

- Go to your repository → Actions
- If Actions are disabled, click "I understand my workflows, go ahead and enable them"

### 4. Verify Backup Works

**Option 1: Wait for scheduled run**
- The backup runs automatically at 2 AM UTC daily
- Check the Actions tab to see the results

**Option 2: Trigger manually**
- Go to Actions → Daily Database Backup
- Click "Run workflow" → "Run workflow"
- This will create a backup immediately

## Backup Details

### What Gets Backed Up

- ✅ All database tables and data
- ✅ Database schema (table definitions, indexes, constraints)
- ✅ Functions and triggers
- ✅ Row Level Security (RLS) policies

### What Doesn't Get Backed Up

- ❌ Storage files (uploaded images, documents, etc.)
- ❌ Auth users (managed separately by Supabase)
- ❌ Realtime subscriptions

### Backup Schedule

- **Frequency**: Daily at 2 AM UTC
- **Retention**: Last 30 backups are kept in the repository
- **Artifacts**: Each backup is also available as a GitHub Actions artifact for 30 days

### Backup Location

Backups are stored in the `backups/` directory with the following naming convention:
```
backups/
  ├── backup_2025-10-18_02-00-00.sql.gz
  ├── backup_2025-10-18_02-00-00.json
  ├── backup_2025-10-17_02-00-00.sql.gz
  └── backup_2025-10-17_02-00-00.json
```

## Restoring from Backup

### Method 1: Using pg_restore (Recommended)

1. Download the backup file:
```bash
cd backups
gunzip backup_YYYY-MM-DD_HH-MM-SS.sql.gz
```

2. Get your Supabase connection string:
   - Go to Supabase Dashboard → Settings → Database
   - Copy the connection string (select "URI" format)

3. Restore the database:
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres" < backup_YYYY-MM-DD_HH-MM-SS.sql
```

### Method 2: Using Supabase Dashboard

1. Download and decompress the backup file
2. Go to Supabase Dashboard → SQL Editor
3. Copy and paste the SQL content
4. Run the SQL (in chunks if the file is large)

### Method 3: Using GitHub Actions Artifact

1. Go to Actions → Daily Database Backup → Select a workflow run
2. Download the artifact (backup file)
3. Follow Method 1 or 2 above

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
