# Database Activity & Backup Logging

## Overview

The backup system now writes to a `backup_logs` table in your database, which serves two purposes:
1. **Keeps your free tier active** - Regular database writes prevent Supabase from pausing your project
2. **Provides backup status in Admin Portal** - View backup history and status directly in the app

## How It Works

### Database Activity
- Every backup (daily at 2 AM CST) **writes** to the `backup_logs` table
- This write activity counts as database usage
- Prevents Supabase free tier from pausing due to inactivity
- Plus all the **read** operations fetching table data

### What Gets Logged

Each backup creates a log entry with:
- `backup_date` - When the backup ran
- `status` - success, failed, or in_progress
- `tables_backed_up` - JSON object with table names and record counts
- `total_records` - Total number of records backed up
- `error_message` - Error details if backup failed
- `duration_seconds` - How long the backup took
- `created_at` - Timestamp

### Admin Portal Display

The **Settings** tab now shows:

**Latest Backup Card:**
- Status badge (SUCCESS/FAILED)
- When it ran ("2 hours ago")
- Date and time
- Total records backed up
- Duration
- Number of tables
- Breakdown by table (expandable)

**Full Log View:**
- Last 30 backup runs
- Status for each
- Date and time
- Records and duration
- Error messages for failures

### Migration

**File:** `supabase/migrations/20251018_create_backup_logs.sql`

Creates:
- `backup_logs` table
- Index on `backup_date` for fast queries
- RLS policies (public read, service role insert)

**To Apply:**
Run this SQL in your Supabase SQL Editor or apply via migration tool.

## Benefits

✅ **Database Stays Active** - Daily writes prevent free tier pausing  
✅ **Backup Visibility** - See backup status without checking GitHub Actions  
✅ **Error Tracking** - Know immediately if a backup fails  
✅ **Historical Record** - See backup history for last 30 runs  
✅ **Non-Technical Friendly** - Easy to check backup status in app  

## Technical Details

### Workflow Changes

The backup workflow (`backup-database-api.yml`) now:

1. **Tracks time** - Records start time before backup begins
2. **Logs success** - Writes to `backup_logs` on successful backup with:
   - All table counts
   - Total records
   - Duration
3. **Logs failure** - If backup fails, logs the error message

### Component

**File:** `src/components/BackupStatus.tsx`

Features:
- Real-time backup status from database
- Collapsible table breakdown
- Full log view (last 30 backups)
- Automatic refresh
- Dark mode support
- Responsive design

### Database Schema

```sql
CREATE TABLE backup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_date timestamp with time zone NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'in_progress')),
  tables_backed_up jsonb,
  total_records integer,
  error_message text,
  duration_seconds integer,
  created_at timestamp with time zone DEFAULT now()
);
```

## Maintenance

- Logs are kept indefinitely (consider adding cleanup if needed)
- Each log entry is small (~1-2 KB)
- 30 days of logs ≈ ~60 KB total
- No significant storage impact

## Troubleshooting

**"No backup logs found"**
- First backup hasn't run yet
- Run manually: Actions → "Daily Database Backup (API Method)" → "Run workflow"

**"Backup failed" status**
- Click to see error message
- Check GitHub secrets are correct
- Review workflow logs in Actions tab

**Logs not showing in admin**
- Make sure migration has been applied
- Check RLS policies are enabled
- Verify table exists in Database

---

**Status**: ✅ Implemented  
**Last Updated**: October 18, 2025  
**Migration Required**: Yes - Run `20251018_create_backup_logs.sql`
