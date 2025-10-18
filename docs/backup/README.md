# Database Backup Documentation

Comprehensive documentation for the database backup and restore system.

## Quick Links

### Getting Started
- **[BACKUP_QUICK_START.md](./BACKUP_QUICK_START.md)** - Quick setup guide (5 minutes)
- **[BACKUP_README.md](./BACKUP_README.md)** - Main backup documentation
- **[BACKUP_SETUP.md](./BACKUP_SETUP.md)** - Detailed setup instructions

### User Guides
- **[BACKUP_SIMPLE_GUIDE.md](./BACKUP_SIMPLE_GUIDE.md)** - Non-technical user guide
- **[RESTORE_SIMPLE_GUIDE.md](./RESTORE_SIMPLE_GUIDE.md)** - How to restore from backups
- **[MANUAL_BACKUP_IMPLEMENTATION.md](./MANUAL_BACKUP_IMPLEMENTATION.md)** - Manual backup/restore features

### Technical Documentation
- **[BACKUP_AUTO_DISCOVERY.md](./BACKUP_AUTO_DISCOVERY.md)** - Auto-discovery system (future-proof)
- **[BACKUP_METHODS.md](./BACKUP_METHODS.md)** - Different backup methods explained
- **[BACKUP_VERIFICATION.md](./BACKUP_VERIFICATION.md)** - Backup verification workflow
- **[BACKUP_ACTIVITY.md](./BACKUP_ACTIVITY.md)** - How backups keep database active

### Implementation History
- **[BACKUP_COMPLETE.md](./BACKUP_COMPLETE.md)** - Implementation summary
- **[BACKUP_FINAL.md](./BACKUP_FINAL.md)** - Final implementation notes
- **[BACKUP_ADD_TABLES.md](./BACKUP_ADD_TABLES.md)** - Adding new tables guide
- **[BACKUP_COMPONENT_REMOVAL.md](./BACKUP_COMPONENT_REMOVAL.md)** - Component cleanup notes

## System Overview

The backup system provides:
- ✅ **Automated daily backups** at 2 AM CST
- ✅ **Auto-discovery** of all database tables
- ✅ **Manual backup/restore** via Admin Portal
- ✅ **30-day retention** with automatic cleanup
- ✅ **GitHub Actions** integration
- ✅ **Future-proof** design

## Key Features

### Automated Backups
- Runs daily via GitHub Actions
- JSON format with all table data
- Stored as artifacts (30-day retention)
- Logs to database (keeps free tier active)

### Manual Backups
- One-click download from Admin Portal
- Instant JSON backup of all data
- No GitHub access required

### Manual Restore
- Upload backup file through Admin Portal
- Validates before restoring
- Handles dependencies automatically
- Skips operational tables (analytics, backup_logs)

### Auto-Discovery
- Automatically discovers all tables
- No code updates needed when schema changes
- Uses `backup_tables` database view
- Future-proof design

## Quick Start

1. **Automated backups are already running** - Check GitHub Actions
2. **Manual backup**: Admin Portal → Settings → Backup Status → "Manual Backup"
3. **Manual restore**: Admin Portal → Settings → Backup Status → "Restore"
4. **View history**: Admin Portal shows last 5 backups (expandable to 100)

## File Structure

```
/Users/marklarson/Documents/GitHub/prayerapp/
├── .github/workflows/
│   ├── backup-database-api.yml      # Daily backup workflow
│   ├── restore-database.yml         # Restore workflow
│   └── verify-backups.yml          # Verification workflow
├── supabase/migrations/
│   ├── 20251018_create_backup_logs.sql        # Backup tracking
│   └── 20251018_create_backup_tables_view.sql # Auto-discovery
├── src/components/
│   └── BackupStatus.tsx            # Admin UI component
├── backups/
│   └── README.md                   # Local backups info
└── docs/backup/
    └── [All documentation files]
```

## Support

For issues or questions:
1. Check the relevant documentation above
2. Review GitHub Actions logs
3. Check Admin Portal backup status
4. Verify Supabase connection

## Related Documentation

- [Testing Documentation](../TESTING.md) - Test the backup system
- [Supabase Setup](../SUPABASE_SETUP.md) - Database configuration
