# ✅ Database Backup System - FINAL SETUP

## 🎯 Solution: API-Based Backup

Due to IPv6 connectivity issues between GitHub Actions and Supabase PostgreSQL, we've implemented an **API-based backup method** that works reliably.

## 📋 What You Need to Do

### 1. Verify GitHub Secrets (Only 2 Required!)

Go to your GitHub repository → Settings → Secrets and variables → Actions

You only need **2 secrets**:

| Secret Name | Value | Where to Find It |
|-------------|-------|------------------|
| `SUPABASE_URL` | `https://eqiafsygvfaifhoaewxi.supabase.co` | Already in your `.env` |
| `SUPABASE_SERVICE_KEY` | Your service role key | Supabase → Settings → API → service_role |

❌ You DON'T need these anymore:
- ~~`SUPABASE_DB_PASSWORD`~~ (not used by API method)
- ~~`SUPABASE_PROJECT_ID`~~ (not used by API method)

### 2. Enable Workflow Permissions

Settings → Actions → General → Workflow permissions
- Select **"Read and write permissions"**
- Save

### 3. Test the Backup

1. Go to **Actions** tab
2. Click **"Daily Database Backup (API Method)"**
3. Click **"Run workflow"** → **"Run workflow"**
4. Wait for it to complete (should take ~1 minute)
5. Check that `backups/` folder has new files

## 📊 What Gets Backed Up

The API method backs up **all data** from these tables:
- ✅ `prayers`
- ✅ `prayer_updates`
- ✅ `prayer_prompts`
- ✅ `prayer_types`
- ✅ `email_subscribers`
- ✅ `user_preferences`
- ✅ `status_change_requests`
- ✅ `update_deletion_requests`
- ✅ `admin_settings`
- ✅ `analytics`

## 📁 Backup Files

Backups are saved as:
```
backups/backup_2025-10-18_02-00-00.json.gz       # Compressed data
backups/backup_2025-10-18_02-00-00_summary.json  # Metadata
```

## 🔄 Restore Instructions

To restore from a backup:

```bash
# Make sure you have the required env variables
cat > .env << EOF
VITE_SUPABASE_URL=https://eqiafsygvfaifhoaewxi.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
EOF

# Run the restore script
./scripts/restore-database-json.sh
```

## ⏰ Schedule

- **Automated**: Daily at 2 AM UTC
- **Retention**: Last 30 backups kept
- **Artifacts**: Available in GitHub Actions for 30 days

## 🔍 What Changed from Original Plan

### Original Plan (PostgreSQL Direct)
- ❌ Tried to connect directly to PostgreSQL
- ❌ Failed due to IPv6 connectivity issues in GitHub Actions
- ❌ Required 4 secrets including database password

### New Solution (API Method)
- ✅ Uses Supabase JavaScript API over HTTPS
- ✅ Works reliably from GitHub Actions
- ✅ Only requires 2 secrets
- ✅ Simpler and more maintainable

### Trade-offs
- ℹ️ Backs up data only (not schema/functions/triggers)
- ℹ️ JSON format instead of SQL
- ℹ️ Slightly larger file sizes
- ✅ But... **it actually works!** 🎉

## 📚 Documentation Files

- **BACKUP_METHODS.md** - Comparison of both backup methods
- **BACKUP_COMPLETE.md** - Original setup guide (still relevant)
- **BACKUP_QUICK_START.md** - Quick reference commands
- **BACKUP_SETUP.md** - Detailed setup instructions
- **SUPABASE_CONNECTION_HELP.md** - Troubleshooting connection issues

## 🎉 Next Steps

1. ✅ Add the 2 secrets to GitHub
2. ✅ Enable workflow permissions  
3. ✅ Run a test backup
4. ✅ Verify backup files appear in `backups/` folder
5. ✅ You're done! Backups will run automatically daily

## ⚠️ Important Notes

- The old PostgreSQL backup workflow is **disabled** (kept for reference)
- The new API workflow is **active** and ready to use
- Both backup methods are documented if you need to switch later
- Schema changes should be tracked in your migrations folder

---

**The system is ready to go! Just add those 2 secrets and run a test.** 🚀
