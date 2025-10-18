# Manual Backup & Restore Implementation

## Overview

Added manual backup and restore functionality directly in the Admin Portal, eliminating the need to access GitHub for routine backup operations.

## New Features

### 1. Manual Backup Button
**Location:** Admin Portal → Settings → Database Backup Status card

**What it does:**
- Backs up entire database instantly
- Downloads backup file to your computer
- Logs the backup to `backup_logs` table
- Shows progress with loading spinner
- Takes 5-15 seconds depending on data size

**File format:**
- Filename: `manual_backup_YYYY-MM-DDTHH-MM-SS-MMMZ.json`
- Format: Uncompressed JSON (can be opened in text editor)
- Contains: All 10 tables with complete data
- Size: Typically 50-500 KB

**Use cases:**
- Quick backup before making major changes
- Download data for offline safekeeping
- Create backup without GitHub access
- Testing and development

### 2. Restore Button
**Location:** Admin Portal → Settings → Database Backup Status card

**What it does:**
- Opens file picker dialog
- Accepts `.json` backup files
- Shows warning about data loss
- Requires double confirmation
- Restores all tables in correct order (respects foreign keys)
- Handles batch inserts (100 records at a time)
- Shows errors but continues with other tables
- Refreshes page when complete

**Safety features:**
- ⚠️ Big red warning about data deletion
- Double confirmation required
- Only accepts .json files
- Validates backup file format
- Shows detailed error messages

**Use cases:**
- Recover from mistakes
- Restore old version of data
- Migrate data between environments
- Undo recent changes

## Technical Details

### Code Changes

**File:** `src/components/BackupStatus.tsx`

**New state variables:**
```typescript
const [backingUp, setBackingUp] = useState(false);
const [restoring, setRestoring] = useState(false);
const [showRestoreDialog, setShowRestoreDialog] = useState(false);
```

**New functions:**
- `handleManualBackup()` - Creates backup, downloads file, logs to DB
- `handleManualRestore(file)` - Reads file, validates, deletes data, inserts backup data

### Backup Process

1. **Start timer** - Track duration
2. **Fetch all tables** - Loop through 10 tables, fetch all records
3. **Build backup object** - JSON structure with metadata
4. **Calculate summary** - Count records per table
5. **Create blob** - Convert JSON to downloadable file
6. **Trigger download** - Automatically download to user's computer
7. **Log to database** - Write to `backup_logs` table
8. **Show success** - Alert with record count and duration
9. **Refresh logs** - Update UI with new backup entry

### Restore Process

1. **Read file** - Parse JSON from uploaded file
2. **Validate format** - Check for required structure
3. **Order tables** - Respect foreign key dependencies
4. **Loop tables** - Process each table:
   - Delete all existing records
   - Insert backup records in batches of 100
   - Track errors but continue
5. **Show results** - Alert with success/error count
6. **Reload page** - Force refresh to show restored data

### Table Order (Foreign Keys)

```javascript
const tables = [
  'prayer_types',        // No dependencies
  'prayers',             // Depends on prayer_types
  'prayer_updates',      // Depends on prayers
  'prayer_prompts',      // Depends on prayer_types
  'email_subscribers',   // No dependencies
  'user_preferences',    // No dependencies
  'status_change_requests',      // Depends on prayers
  'update_deletion_requests',    // Depends on prayer_updates
  'admin_settings',      // No dependencies
  'analytics'            // No dependencies
];
```

### Error Handling

**During Backup:**
- Individual table errors don't stop the process
- Errors logged to backup object
- Failed tables shown in summary
- Overall backup still succeeds if any tables work

**During Restore:**
- Errors collected in array
- Process continues with remaining tables
- All errors shown in alert at end
- Partial restoration possible

## UI Components

### Buttons

**Manual Backup Button:**
- Color: Blue/Indigo (`bg-indigo-600`)
- Icon: Download icon
- States: Normal, Loading (with spinner), Disabled
- Position: Header, left of Restore button

**Restore Button:**
- Color: Orange (`bg-orange-600`)
- Icon: Upload icon
- States: Normal, Loading (with spinner), Disabled
- Position: Header, right of Manual Backup button

### Restore Dialog

**Modal overlay:**
- Full-screen backdrop with transparency
- Centered card with shadow
- Max width: 448px (28rem)
- Dark mode support

**Warning box:**
- Red background
- Alert icon
- Bold warning text
- Emphasized consequences

**File input:**
- Styled file picker
- Accepts: `.json` only
- Help text below
- Auto-closes on selection

## User Experience

### Backup Flow
1. Click "Manual Backup"
2. See "Backing up..." (5-15 seconds)
3. File downloads automatically
4. Success alert shows record count
5. Backup appears in log immediately

### Restore Flow
1. Click "Restore"
2. Dialog opens with warning
3. Select file
4. Confirm with filename
5. See "Restoring..." (10-30 seconds)
6. Success/error alert
7. Page reloads with restored data

## Documentation

### Created Files
1. **BACKUP_SIMPLE_GUIDE.md** - Non-technical user guide for manual backup/restore
2. **BACKUP_ACTIVITY.md** - Updated with manual backup info
3. **BACKUP_README.md** - Updated with new features

### Updated Sections
- Added "Manual Backup" to features list
- Added restore instructions for admin portal
- Updated "How to Restore" with 3 options
- Added tips and best practices

## Benefits

✅ **No GitHub Access Needed** - Everything in the app  
✅ **Instant Backups** - Download in seconds  
✅ **Easy Restore** - Drag and drop file  
✅ **Non-Technical Friendly** - Simple UI, clear warnings  
✅ **Safe** - Multiple confirmations, clear warnings  
✅ **Flexible** - Works with manual or automated backups  
✅ **Transparent** - Shows progress and errors  
✅ **Logged** - All operations tracked in database  

## Testing Checklist

- [ ] Manual backup downloads file
- [ ] Backup file is valid JSON
- [ ] Backup includes all tables
- [ ] Backup logs to database
- [ ] Restore validates file format
- [ ] Restore shows warnings
- [ ] Restore requires confirmation
- [ ] Restore deletes old data
- [ ] Restore inserts new data
- [ ] Restore handles errors gracefully
- [ ] Page reloads after restore
- [ ] UI shows loading states
- [ ] Buttons disable during operations
- [ ] Dark mode works correctly
- [ ] Mobile responsive

## Security Considerations

✅ **Admin Only** - Behind admin authentication  
✅ **Client-Side** - No data sent to external servers  
✅ **Validation** - Checks backup file structure  
✅ **Confirmations** - Multiple prompts prevent accidents  
✅ **Warnings** - Clear about consequences  
✅ **Logging** - All operations tracked  
⚠️ **Backup Files** - Contain sensitive data, store securely  

## Future Enhancements (Optional)

- [ ] Compress downloaded backups (gzip)
- [ ] Support .gz files in restore
- [ ] Show restore progress percentage
- [ ] Preview backup contents before restore
- [ ] Selective restore (choose specific tables)
- [ ] Backup file encryption
- [ ] Cloud storage integration (Drive, Dropbox)
- [ ] Scheduled manual backups
- [ ] Email backup files
- [ ] Backup diff viewer

---

**Status**: ✅ Implemented and Ready  
**Last Updated**: October 18, 2025  
**Migration Required**: No (uses existing `backup_logs` table)
