# Adding New Tables to Backup

If you add new tables to your Supabase database, you need to update the backup script to include them.

## How to Add a New Table

1. **Edit the workflow file**:
   - Open `.github/workflows/backup-database-api.yml`

2. **Find the tables array** (around line 39):
   ```javascript
   const tables = [
     'prayers',
     'prayer_updates',
     'prayer_prompts',
     'prayer_types',
     'email_subscribers',
     'user_preferences',
     'status_change_requests',
     'update_deletion_requests',
     'admin_settings',
     'analytics'
   ];
   ```

3. **Add your new table name**:
   ```javascript
   const tables = [
     'prayers',
     'prayer_updates',
     'prayer_prompts',
     'prayer_types',
     'email_subscribers',
     'user_preferences',
     'status_change_requests',
     'update_deletion_requests',
     'admin_settings',
     'analytics',
     'your_new_table'  // Add here
   ];
   ```

4. **Commit and push the change**

5. **Test the backup**:
   - Go to Actions → Daily Database Backup (API Method)
   - Run workflow manually
   - Check that your new table is included

## Current Tables Being Backed Up

As of October 18, 2025:

| Table Name | Purpose |
|------------|---------|
| `prayers` | Main prayer requests |
| `prayer_updates` | Updates and comments on prayers |
| `prayer_prompts` | Prayer prompts for ACTS method |
| `prayer_types` | Categories/types of prayers |
| `email_subscribers` | Email subscription list |
| `user_preferences` | User settings and preferences |
| `status_change_requests` | Approval workflow for status changes |
| `update_deletion_requests` | Approval workflow for deletions |
| `admin_settings` | Admin portal configuration |
| `analytics` | Usage analytics data |

## Automatic Table Discovery (Future Enhancement)

For automatic table discovery, you could modify the backup script to:

1. Query the Supabase schema
2. Get all table names automatically
3. Backup everything

However, this requires more complex logic and error handling. The current explicit list method is more reliable and predictable.

## Excluding Tables from Backup

To exclude a table, simply remove it from the list. For example, if you don't want to backup analytics data:

```javascript
const tables = [
  'prayers',
  'prayer_updates',
  // ... other tables
  // 'analytics'  // Excluded
];
```

## Testing

After adding a new table:

```bash
# Run a test backup locally (if you have the scripts set up)
node backup-script.js

# Or trigger via GitHub Actions
# Actions → Daily Database Backup (API Method) → Run workflow
```

Check the backup summary file to verify your table was included:
```bash
cat backups/backup_*_summary.json
```
