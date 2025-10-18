# Database Backups

This directory contains automated backups of the Supabase database.

## Backup Files

Backups are stored in the following format:
- `backup_YYYY-MM-DD_HH-MM-SS.sql.gz` - Compressed database dump
- `backup_YYYY-MM-DD_HH-MM-SS.json` - Backup metadata

## Retention Policy

- **Automated**: Last 30 backups are kept in this directory
- **Artifacts**: Backups are also available as GitHub Actions artifacts for 30 days

## Using Backups

### To Restore a Backup

```bash
# Use the restore script
./scripts/restore-database.sh
```

### To View a Backup

```bash
# Decompress the backup
gunzip -c backup_2025-10-18_02-00-00.sql.gz | less

# Or save to a file
gunzip backup_2025-10-18_02-00-00.sql.gz
```

### To Verify a Backup

```bash
# Check if file is valid
gzip -t backup_2025-10-18_02-00-00.sql.gz

# View metadata
cat backup_2025-10-18_02-00-00.json
```

## Backup Schedule

Backups are created:
- **Daily** at 2:00 AM UTC via GitHub Actions
- **On-demand** via manual workflow trigger
- **Locally** using `./scripts/backup-database.sh`

## File Sizes

Typical backup sizes (compressed):
- Small database (< 1000 rows): 10-50 KB
- Medium database (1000-10000 rows): 50-500 KB
- Large database (> 10000 rows): 500 KB - 5 MB

## Security

⚠️ **Important**: 
- Keep this repository PRIVATE
- These backups contain all your database data
- Never share backup files publicly
- Backups include sensitive information

## Troubleshooting

If backups are not being created:
1. Check GitHub Actions logs
2. Verify GitHub secrets are set correctly
3. Ensure workflow permissions are enabled
4. Check your Supabase database is accessible

For more help, see [BACKUP_SETUP.md](../BACKUP_SETUP.md)
