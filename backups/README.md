# Database Backups

This directory contains local database backups downloaded from the Admin Portal.

## Backup System Overview

The backup system uses **API-based backups** with automatic table discovery for future-proof operation.

## Backup Files

Backups are stored in JSON format:
- `backup_YYYY-MM-DD_HH-MM-SS.json` - Complete database backup (all tables and data)
- `backup_YYYY-MM-DD_HH-MM-SS.json.gz` - Compressed backup from GitHub Actions

## Backup Methods

### 1. **Automated Daily Backups** (Recommended)
- Runs daily at **2:00 AM CST** via GitHub Actions
- Automatically discovers all database tables (no code updates needed when schema changes)
- Logs backup metadata to `backup_logs` table (keeps free tier database active)
- Stored as GitHub Actions artifacts for 30 days
- Old backup logs automatically cleaned up after 30 days

### 2. **Manual Backup** (Admin Portal)
- Click "Manual Backup" button in Admin Portal → Settings → Backup Status
- Downloads backup immediately to your computer
- Includes all tables except operational data (analytics, backup_logs)
- Also logs to database for tracking

### 3. **GitHub Actions Restore Workflow**
- For restoring from artifact backups
- Navigate to Actions → Restore Database
- Enter the backup Run ID
- Requires service role permissions

## Using Backups

### To Create a Manual Backup

1. Log in to Admin Portal
2. Go to **Settings** tab
3. Scroll to **Backup Status** section
4. Click **"Manual Backup"** button
5. Backup downloads automatically as JSON file

### To Restore a Backup

#### Option A: Manual Restore (Admin Portal)
1. Log in to Admin Portal
2. Go to **Settings** tab → **Backup Status**
3. Click **"Restore"** button
4. Select your backup JSON file
5. Confirm the warning (this deletes all current data!)
6. Wait for restore to complete

**Note**: Manual restore skips `analytics` and `backup_logs` tables (operational data you don't want to restore).

#### Option B: GitHub Actions Restore
1. Go to GitHub → Actions → "Restore Database from Backup"
2. Click "Run workflow"
3. Enter the backup Run ID (from Actions history)
4. Includes all tables (requires service_role permissions)

### To View Backup Contents

```bash
# View backup metadata
cat backup_2025-10-18_02-00-00.json | jq '.timestamp, .version, .tables | keys'

# View specific table data
cat backup_2025-10-18_02-00-00.json | jq '.tables.prayers.data'

# Check record counts per table
cat backup_2025-10-18_02-00-00.json | jq '.tables | map_values(.count)'
```

### To Verify a Backup

```bash
# Verify JSON is valid
cat backup_2025-10-18_02-00-00.json | jq empty

# Check backup structure
cat backup_2025-10-18_02-00-00.json | jq 'keys'

# List all backed up tables
cat backup_2025-10-18_02-00-00.json | jq '.tables | keys'
```

## Auto-Discovery

The backup system automatically discovers all tables in your database using the `backup_tables` view. This means:
- ✅ **No code updates needed** when you add new tables
- ✅ **Future-proof** - backs up everything automatically
- ✅ **Excludes system tables** - only backs up your data

## Retention Policy

### GitHub Actions Artifacts
- Stored for **30 days** (automatic cleanup)
- Accessible from Actions tab

### Backup Logs (Database)
- Stored for **30 days** (automatic cleanup)
- Viewable in Admin Portal → Settings → Backup Status
- Shows last 5 backups initially, expandable to 100

### Local Backups
- Manual downloads stored permanently on your computer
- No automatic cleanup - manage manually

## File Sizes

Typical backup sizes (uncompressed JSON):
- Small database (< 1000 rows): 50-200 KB
- Medium database (1000-10000 rows): 200 KB - 2 MB
- Large database (> 10000 rows): 2-20 MB

Compressed (.gz): Usually 5-10x smaller

## Tables Backed Up

The system backs up ALL user tables, including:
- `prayers`, `prayer_updates`, `prayer_prompts`
- `prayer_types`, `email_subscribers`
- `user_preferences`, `admin_settings`
- `status_change_requests`, `update_deletion_requests`
- `analytics`, `backup_logs`
- Any future tables you add

**Manual Restore Exclusions**: `analytics` and `backup_logs` are skipped during manual restore (operational data that shouldn't be restored).

## Security

⚠️ **Important**: 
- Keep this repository **PRIVATE**
- Backups contain all your database data including:
  - Prayer requests (potentially sensitive)
  - Email addresses
  - User preferences
  - Admin settings
- Never share backup files publicly
- GitHub Actions artifacts are private (only repo collaborators can access)

## Troubleshooting

### Backups Not Running
1. Check GitHub Actions logs under "Actions" tab
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` secrets are set
3. Ensure workflow has permissions to create artifacts

### Manual Backup Fails
1. Check browser console for errors
2. Verify you're logged in as admin
3. Check Supabase connection

### Restore Errors
1. **RLS Policy Errors**: Manual restore automatically skips `analytics` and `backup_logs`
2. **Foreign Key Errors**: Tables are restored in dependency order
3. **Format Errors**: Ensure backup file is valid JSON

### Backup Logs Not Showing
1. Check if `backup_logs` table exists
2. Verify RLS policies allow authenticated reads
3. Check browser console for errors

## Additional Documentation

- [BACKUP_README.md](../BACKUP_README.md) - Comprehensive backup documentation
- [BACKUP_SIMPLE_GUIDE.md](../BACKUP_SIMPLE_GUIDE.md) - Non-technical user guide
- [BACKUP_AUTO_DISCOVERY.md](../BACKUP_AUTO_DISCOVERY.md) - Auto-discovery technical details
- [MANUAL_BACKUP_IMPLEMENTATION.md](../MANUAL_BACKUP_IMPLEMENTATION.md) - Implementation details
