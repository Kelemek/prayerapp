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

Your backups will run automatically every day at 2 AM UTC.

## 📋 What Gets Backed Up

All data from these tables:
- prayers, prayer_updates, prayer_prompts
- prayer_types, email_subscribers, user_preferences
- status_change_requests, update_deletion_requests
- admin_settings, analytics

## 🔄 How to Restore

```bash
# Run the restore script
./scripts/restore-database-json.sh

# Follow the prompts to select a backup
```

## 📁 Backup Files

Location: `backups/` folder

Format:
- `backup_YYYY-MM-DD_HH-MM-SS.json.gz` - Compressed data
- `backup_YYYY-MM-DD_HH-MM-SS_summary.json` - Backup info

Retention: Last 30 backups (auto-cleanup)

## 🚀 Test the Backup Now

1. Go to **Actions** tab
2. Click **"Daily Database Backup (API Method)"**
3. Click **"Run workflow"** → **"Run workflow"**
4. Wait ~1 minute
5. Check `backups/` folder for new files

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
- Use `./scripts/restore-database-json.sh`
- Make sure `.env` has `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

---

**Status**: ✅ Active and backing up daily  
**Last Updated**: October 18, 2025  
**Backup Method**: API-based (JSON format)
