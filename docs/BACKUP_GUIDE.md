# Database Backup & Restore Guide

Complete guide for backing up and restoring your Prayer App database.

---

## Table of Contents

- [Overview](#overview)
- [Quick Setup](#quick-setup)
- [Creating Backups](#creating-backups)
- [Restoring Backups](#restoring-backups)
- [Managing Backups](#managing-backups)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Prayer App includes an automated backup system that protects your data with:

- ✅ **Automated Daily Backups** - Runs at 2:00 AM CST via GitHub Actions
- ✅ **Manual Backups** - Instant download from Admin Portal
- ✅ **Easy Restore** - Upload backup file in Admin Portal
- ✅ **Auto-Discovery** - Automatically backs up all tables (future-proof)
- ✅ **30-Day Retention** - Backups stored for 30 days
- ✅ **Activity Logging** - Keeps free tier database active
- ✅ **No GitHub Required** - Everything accessible in the app

---

## Quick Setup

### Prerequisites

- GitHub repository for your project
- Supabase project with service role key
- Admin access to GitHub repository settings

### 1. Add GitHub Secrets

1. Go to **GitHub repository → Settings → Secrets and variables → Actions**
2. Click **"New repository secret"**
3. Add these 2 secrets:

| Secret Name | Value | Where to Find |
|-------------|-------|---------------|
| `SUPABASE_URL` | Your Supabase URL | `.env` file as `VITE_SUPABASE_URL` |
| `SUPABASE_SERVICE_KEY` | Service role key | Supabase Dashboard → Settings → API → service_role key |

### 2. Enable Workflow Permissions

1. Go to **Settings → Actions → General**
2. Scroll to **Workflow permissions**
3. Select **"Read and write permissions"**
4. Click **Save**

### 3. Verify Setup

1. Go to **Actions** tab
2. Click **"Daily Database Backup (API Method)"**
3. Click **"Run workflow"** to test
4. Wait ~1 minute and verify green checkmark ✅

---

## Creating Backups

### Automated Daily Backups

**Schedule**: Every day at 2:00 AM CST (automatic)

**What happens:**
1. GitHub Actions workflow runs automatically
2. Connects to Supabase using service key
3. Auto-discovers all database tables
4. Exports all data to JSON format
5. Compresses and stores as artifact
6. Logs backup details to `backup_logs` table

**View backups:**
1. Go to **Actions** tab
2. Click **"Daily Database Backup (API Method)"**
3. See list of all backup runs
4. Click any run to download artifacts

### Manual Backups (In-App)

**When to use:**
- Before making major changes
- Before testing new features
- For immediate backup needs
- When you want local copy

**Steps:**

1. **Log in to Admin Portal**
   - Open your prayer app
   - Click Settings icon → Admin Login
   - Enter admin password

2. **Navigate to Backup Section**
   - Go to **Settings** tab
   - Scroll to **Database Backup Status** card

3. **Create Backup**
   - Click blue **"Manual Backup"** button
   - Wait a few seconds (you'll see "Backing up...")
   - File downloads automatically

4. **Save the File**
   - File named: `manual_backup_YYYY-MM-DD_HH-MM-SS.json`
   - Save to safe location (cloud storage, external drive)
   - Keep multiple copies in different locations

**Benefits:**
- ✅ Instant download to your computer
- ✅ No GitHub access required
- ✅ Logged in backup history
- ✅ Works offline (once downloaded)

---

## Restoring Backups

### ⚠️ Important Warning

**Restoring will DELETE ALL current data and replace it with the backup!**

Always create a current backup before restoring to avoid data loss.

### Method 1: Admin Portal (Recommended - Easiest)

**Steps:**

1. **Log in to Admin Portal**
   - Open prayer app → Admin Login
   - Enter admin password

2. **Go to Backup Section**
   - Click **Settings** tab
   - Find **Database Backup Status** card

3. **Start Restore**
   - Click orange **"Restore"** button
   - Warning dialog appears

4. **Select Backup File**
   - Click **"Choose File"**
   - Select your backup file (`.json`)
   - Works with both manual and automated backups

5. **Confirm Restoration**
   - Read the warning carefully
   - Click **"OK"** to confirm
   - **This cannot be undone!**

6. **Wait for Completion**
   - Shows "Restoring..." message
   - Usually takes 10-30 seconds
   - Page refreshes automatically when done

**✅ Restoration Complete!**

### Method 2: GitHub Actions Workflow

**For automated backups stored in GitHub:**

1. **Find Backup Run ID**
   - Go to **Actions** tab
   - Click **"Daily Database Backup (API Method)"**
   - Click the backup you want to restore
   - Copy the Run ID from URL (e.g., `12345678`)

2. **Run Restore Workflow**
   - Click **"Restore Database from Backup"** (left sidebar)
   - Click **"Run workflow"** button

3. **Enter Details**
   - **Run ID**: Paste the number you copied
   - **Confirmation**: Type `RESTORE` (all caps)
   - Click **"Run workflow"**

4. **Wait for Completion**
   - Watch for green checkmark ✅
   - Usually takes 1-2 minutes
   - Check logs if errors occur

### Method 3: Command Line (Technical Users)

```bash
# Download backup from GitHub Actions artifacts
# Extract to backups/ folder

# Run restore script
./scripts/restore-database-json.sh

# Script will prompt for backup file selection
# Follow on-screen instructions
```

**Requirements:**
- Backup file in `backups/` directory
- `.env` file with `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Node.js installed

---

## Managing Backups

### View Backup History

**In Admin Portal:**

1. Go to **Settings** tab
2. See **Database Backup Status** card
3. Shows:
   - Latest backup date/time
   - Number of records backed up
   - Backup duration
   - Success/failure status

**Click "View History"** to see:
- Last 30 backups
- Backup date and time
- Record counts per table
- Total records
- Success/failure status
- Expandable details

**In GitHub:**

1. Go to **Actions** tab
2. Click **"Daily Database Backup (API Method)"**
3. See all workflow runs (30 days)
4. Download artifacts from any successful run

### Download Backups

**From Admin Portal:**
- Click **"Manual Backup"** → instant download

**From GitHub:**
1. Actions → Daily Database Backup
2. Click a successful run
3. Scroll to **Artifacts** section
4. Download backup file

### Backup File Format

**Filenames:**
- Manual: `manual_backup_YYYY-MM-DD_HH-MM-SS.json`
- Automated: `backup_YYYY-MM-DD_HH-MM-SS.json.gz`

**Format:** JSON (human-readable text)

**Contents:**
- All database tables
- All records with complete data
- Table names and row counts
- Backup metadata

**What's NOT backed up:**
- Environment variables
- Supabase configuration
- GitHub secrets
- File uploads (if any)

---

## What Gets Backed Up

### Auto-Discovery System

The backup system **automatically discovers all tables** in your database.

**This means:**
- Add new tables → automatically backed up
- Modify schema → automatically handled
- No code updates needed
- Future-proof design

### Current Tables (Auto-Discovered)

- `prayers` - Prayer requests
- `prayer_updates` - Updates on prayers
- `prayer_prompts` - Inspirational prompts
- `prayer_types` - Prayer categories
- `email_subscribers` - Email list
- `pending_preference_changes` - Email preferences
- `status_change_requests` - Status change requests
- `update_deletion_requests` - Deletion requests
- `admin_settings` - Admin configuration
- `analytics` - Page view analytics
- `backup_logs` - Backup history

**Plus any future tables you create!**

---

## Backup Best Practices

### Regular Backups

✅ **Automated daily backups** run automatically  
✅ **Manual backup before major changes** (bulk approvals, deletions)  
✅ **Weekly manual backups** for extra safety  
✅ **Monthly backups** saved to external storage  

### Storage Locations

✅ **Cloud Storage** - Google Drive, Dropbox, OneDrive  
✅ **External Drive** - USB drive, external hard drive  
✅ **Multiple Locations** - Keep 2-3 copies  
✅ **GitHub Artifacts** - Automatic 30-day retention  

❌ **Don't rely on:**
- Single computer only
- Same device as the app
- Unprotected cloud storage

### Before Restoring

✅ **Create current backup first!**  
✅ Verify backup file is correct  
✅ Confirm you have the right backup date  
✅ Understand all current data will be lost  
✅ Notify other admins/users  

---

## Troubleshooting

### Automated Backup Failures

**Problem:** Backup workflow fails

**Solutions:**
1. Check GitHub secrets are correct:
   - `SUPABASE_URL` matches your project
   - `SUPABASE_SERVICE_KEY` is valid service role key
2. Verify workflow permissions are enabled
3. Check Supabase project is active
4. Review workflow logs in GitHub Actions

**Problem:** "No tables found"

**Solutions:**
- Verify `SUPABASE_SERVICE_KEY` has admin access
- Check database is not empty
- Confirm RLS policies don't block service role

### Manual Backup Issues

**Problem:** "Backup failed" error

**Solutions:**
- Check internet connection
- Refresh page and try again
- Verify admin authentication
- Check browser console for errors

**Problem:** Backup button disabled/gray

**Solutions:**
- Another backup is in progress
- Wait for it to complete
- Refresh the page

**Problem:** Download doesn't start

**Solutions:**
- Check browser popup blocker
- Try different browser
- Verify sufficient disk space

### Restore Failures

**Problem:** "Invalid backup file format"

**Solutions:**
- Verify file is `.json` format
- Check file is not corrupted
- Try different backup file
- Ensure file is complete (not partial download)

**Problem:** "Restore failed" error

**Solutions:**
1. Verify backup file structure is valid
2. Check Supabase connection
3. Ensure service key has write permissions
4. Review browser console for detailed errors

**Problem:** Restore completes but data missing

**Solutions:**
- Check backup file contains expected data
- Verify all tables were included
- Clear browser cache and refresh
- Check Supabase logs for errors

### GitHub Actions Issues

**Problem:** Workflow doesn't run automatically

**Solutions:**
- Check workflow file is in `.github/workflows/`
- Verify cron schedule is correct
- Ensure repository has Actions enabled
- Check for any GitHub outages

**Problem:** Can't download artifact

**Solutions:**
- Artifact expired (30-day retention)
- Use more recent backup
- Create manual backup if needed

---

## Technical Details

### Backup Process

1. **Discovery**: Query database schema for all tables
2. **Export**: Fetch all rows from each table
3. **Format**: Convert to JSON structure
4. **Compress**: Gzip compression (automated backups)
5. **Store**: Upload as GitHub artifact OR download locally
6. **Log**: Write entry to `backup_logs` table

### Restore Process

1. **Validation**: Verify backup file format
2. **Parsing**: Read JSON structure
3. **Deletion**: Truncate all existing tables
4. **Restoration**: Insert all backup data
5. **Verification**: Confirm row counts match
6. **Completion**: Refresh app state

### Database Activity

Each backup writes to the `backup_logs` table, which:
- Keeps free tier database active (prevents pausing)
- Provides audit trail
- Enables backup history viewing
- Tracks success/failure

---

## Related Documentation

- [DATABASE.md](DATABASE.md) - Database schema and structure
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Initial setup instructions
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment procedures
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues

---

**Last Updated**: November 2025  
**Backup Method**: API-based JSON export  
**Status**: ✅ Active and automated
