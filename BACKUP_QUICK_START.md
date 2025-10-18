# Quick Backup & Restore Guide

## 🚀 Quick Start

### 1. Set Up Automated Backups (One-time setup)

1. **Add GitHub Secrets** (required):
   - Go to GitHub repo → Settings → Secrets and variables → Actions
   - Add these secrets:
     - `SUPABASE_URL` - Your Supabase project URL
     - `SUPABASE_PROJECT_ID` - Project ID from URL
     - `SUPABASE_DB_PASSWORD` - Database password
     - `SUPABASE_SERVICE_KEY` - Service role key from API settings

2. **Enable GitHub Actions**:
   - Go to Settings → Actions → General → Workflow permissions
   - Select "Read and write permissions"
   - Save

3. **Test it**:
   - Go to Actions tab → "Daily Database Backup" → "Run workflow"
   - Check that backup appears in `backups/` folder

### 2. Manual Backup (Local)

```bash
# Create .env file with your credentials
cat > .env << EOF
SUPABASE_PROJECT_ID=your_project_id
SUPABASE_DB_PASSWORD=your_password
EOF

# Run backup script
./scripts/backup-database.sh
```

### 3. Restore from Backup

```bash
# Make sure you have .env file set up (see step 2)

# Run restore script
./scripts/restore-database.sh

# Follow the prompts to select a backup
```

## 📋 Common Tasks

### View Recent Backups
```bash
ls -lht backups/ | head -10
```

### Download Backup from GitHub
```bash
# Go to Actions → Select workflow run → Download artifact
# Or clone the repo to get all backups
```

### Create Manual Backup Now
```bash
# Via script
./scripts/backup-database.sh

# Via GitHub Actions
# Go to Actions → Daily Database Backup → Run workflow
```

### Restore Specific Backup
```bash
./scripts/restore-database.sh
# Then enter the filename when prompted, e.g.:
# backup_2025-10-18_02-00-00.sql.gz
```

## ⏰ Backup Schedule

- **Automated**: Daily at 2 AM UTC
- **Retention**: Last 30 backups in repo
- **Artifacts**: Available for 30 days in GitHub Actions

## 🔧 Troubleshooting

### "Permission denied" error
```bash
chmod +x scripts/backup-database.sh scripts/restore-database.sh
```

### "pg_dump: command not found"
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client
```

### GitHub Actions backup fails
1. Check all secrets are set correctly
2. Verify database password is correct
3. Check workflow logs for specific errors

### Restore fails with "permission denied"
- Make sure you're using the correct database password
- Check that your Supabase project is not paused

## 📚 More Information

See [BACKUP_SETUP.md](./BACKUP_SETUP.md) for detailed documentation.
