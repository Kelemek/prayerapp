# 🛡️ Automated Database Backup System

Your Supabase database is protected with automated daily backups using GitHub Actions.

## ✅ Quick Setup (2 Steps)

### 1. Add GitHub Secrets

Go to: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 2 secrets:

| Secret Name | Where to Find It |
|-------------|------------------|
| `SUPABASE_URL` | Already in your `.env` file as `VITE_SUPABASE_URL` |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard → Settings → API → service_role key |

### 2. Enable Workflow Permissions

Go to: **Settings** → **Actions** → **General** → **Workflow permissions**

- Select: **"Read and write permissions"**
- Click: **Save**

## 🎉 That's It!

Your backups will run automatically every day at 2 AM CST.

## ✨ Key Features

✅ **Automated Daily Backups** - Runs at 2:00 AM CST  
✅ **Future-Proof** - Automatically discovers all tables (no code updates needed!)  
✅ **Manual Backups** - Instant download from Admin Portal  
✅ **Easy Restore** - Upload backup file in Admin Portal  
✅ **Keeps DB Active** - Writes to database daily (prevents free tier pausing)  
✅ **Full History** - View last 30 backups with details  
✅ **No GitHub Access Needed** - Everything in the app  

## 🤖 Auto-Discovery

The backup system **automatically discovers all tables** in your database.

**This means:**
- ✅ Add new tables → automatically backed up
- ✅ Change schema → automatically handled  
- ✅ No code updates ever needed
- ✅ Future-proof and maintenance-free

👉 **See [BACKUP_AUTO_DISCOVERY.md](BACKUP_AUTO_DISCOVERY.md) for technical details**

## 📋 What Gets Backed Up

**All current tables** (auto-discovered):
- prayers, prayer_updates, prayer_prompts
- prayer_types, email_subscribers, user_preferences
- status_change_requests, update_deletion_requests
- admin_settings, analytics, backup_logs

**Plus any new tables you create in the future!**

## 🔄 How to Restore

### Option 1: In Admin Portal (Easiest - No GitHub Access Required)

1. Log in to admin
2. Go to **Settings** tab
3. Find **Database Backup Status** card
4. Click **"Restore"** button
5. Select your backup file (.json)
6. Confirm the restoration (⚠️ This will overwrite all current data!)

**Works with:**
- Manual backups downloaded from the app
- Backups downloaded from GitHub Actions artifacts

### Option 2: Using GitHub Actions Workflow

1. Go to **Actions** tab
2. Find the backup you want to restore and copy its Run ID from the URL
3. Click **"Restore Database from Backup"** workflow
4. Click **"Run workflow"**
5. Enter the Run ID and type `RESTORE` to confirm
6. Click **"Run workflow"** button

👉 **See [RESTORE_SIMPLE_GUIDE.md](RESTORE_SIMPLE_GUIDE.md) for detailed step-by-step instructions**

### Option 3: Using Terminal (For Technical Users)

```bash
# Download backup from Actions → Artifacts
# Extract to backups/ folder, then:
./scripts/restore-database-json.sh
```

## 📊 View & Manage Backups

**In the Admin Portal:**
1. Log in to admin
2. Go to **Settings** tab
3. See **Database Backup Status** card at the top

**Features:**
- ✅ Latest backup status and time
- 📈 Records backed up
- ⏱️ Backup duration
- 📋 Full backup history (last 30)
- 💾 **Manual Backup** button - Download current database instantly
- 🔄 **Restore** button - Upload and restore from a backup file

## �📁 Backup Files

**Location**: GitHub Actions Artifacts (not stored in repository)

**Format**:
- `backup_YYYY-MM-DD_HH-MM-SS.json.gz` - Compressed data
- `backup_YYYY-MM-DD_HH-MM-SS_summary.json` - Backup info

**Retention**: 30 days (auto-cleanup)

**Activity Tracking**: Each backup writes to the `backup_logs` table, keeping your free tier database active!

**Access Backups**:
1. Go to **Actions** tab
2. Click **"Daily Database Backup (API Method)"**
3. Click any successful workflow run
4. Scroll to **Artifacts** section
5. Download the backup file

## � Create Manual Backup

### In Admin Portal (Instant Download)

1. Log in to admin
2. Go to **Settings** tab
3. Find **Database Backup Status** card
4. Click **"Manual Backup"** button
5. Wait a few seconds
6. Backup file downloads automatically as `manual_backup_YYYY-MM-DD...json`

**Benefits:**
- ✅ Instant download to your computer
- ✅ No GitHub access required
- ✅ Perfect before making major changes
- ✅ Logged to backup history

### Via GitHub Actions

1. Go to **Actions** tab
2. Click **"Daily Database Backup (API Method)"**
3. Click **"Run workflow"** → **"Run workflow"**
4. Wait ~1 minute
5. Download artifact from the workflow run

## 📚 More Information

- **BACKUP_FINAL.md** - Complete setup guide
- **BACKUP_QUICK_START.md** - Quick reference
- **BACKUP_METHODS.md** - Technical details
- **BACKUP_ADD_TABLES.md** - Adding new tables

## 🆘 Troubleshooting

**Backup fails?**
- Verify GitHub secrets are correct
- Check Actions workflow logs
- Make sure workflow permissions are enabled

**Need to restore?**
1. Download backup from **Actions** → **Artifacts**
2. Extract to `backups/` folder
3. Run `./scripts/restore-database-json.sh`
4. Make sure `.env` has `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

---

**Status**: ✅ Active and backing up daily  
**Last Updated**: October 18, 2025  
**Backup Method**: API-based (JSON format)
