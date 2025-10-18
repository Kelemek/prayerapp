# Database Backup Methods - Comparison

Due to network connectivity issues between GitHub Actions and Supabase's PostgreSQL server, we now provide **two backup methods**:

## Method 1: API-Based Backup (Recommended) ✅

**Workflow File**: `.github/workflows/backup-database-api.yml`

### How It Works
- Uses Supabase JavaScript API to fetch all table data
- Saves data as JSON format
- No direct database connection needed
- Works reliably from GitHub Actions

### Pros
✅ **Reliable** - Works from GitHub Actions without network issues  
✅ **Easy Setup** - Only needs `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`  
✅ **No Port Issues** - Uses HTTPS API, not database ports  
✅ **Readable Format** - JSON files are human-readable  

### Cons
❌ **JSON Format** - Not a standard SQL dump  
❌ **Data Only** - Doesn't include schema, functions, or triggers  
❌ **Larger Files** - JSON is less efficient than SQL  
❌ **Table List** - Needs to know table names in advance  

### Required Secrets
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Service role key from API settings

### Restore Process
```bash
./scripts/restore-database-json.sh
```

---

## Method 2: Direct PostgreSQL Backup (Advanced)

**Workflow File**: `.github/workflows/backup-database.yml`

### How It Works
- Uses `pg_dump` to connect directly to PostgreSQL
- Creates standard SQL dump files
- Requires direct database network access

### Pros
✅ **Complete Backup** - Includes schema, functions, triggers, RLS policies  
✅ **Standard Format** - Uses PostgreSQL's native dump format  
✅ **Smaller Files** - More efficient compression  
✅ **Industry Standard** - Works with any PostgreSQL tool  

### Cons
❌ **Network Issues** - GitHub Actions may have IPv6/connectivity problems  
❌ **More Secrets** - Requires database password  
❌ **Port Access** - Needs database port open (5432 or 6543)  
❌ **May Fail** - Dependent on network connectivity  

### Required Secrets
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_PROJECT_ID` - Project ID from URL
- `SUPABASE_DB_PASSWORD` - Database password
- `SUPABASE_SERVICE_KEY` - Service role key

### Restore Process
```bash
./scripts/restore-database.sh
```

---

## Which Method Should You Use?

### Use API-Based Backup (Method 1) If:
- ✅ You're experiencing connection issues from GitHub Actions
- ✅ You only need to backup data (not schema or functions)
- ✅ You want a simple, reliable solution
- ✅ JSON format is acceptable for your needs

### Use PostgreSQL Backup (Method 2) If:
- ✅ You need a complete database backup (schema + data)
- ✅ Direct database connection works from GitHub Actions
- ✅ You need standard PostgreSQL dump format
- ✅ You're comfortable troubleshooting network issues

---

## Current Recommendation

**Use Method 1 (API-Based Backup)** because:
1. GitHub Actions is having IPv6 connectivity issues with Supabase
2. The API method is more reliable for cloud-to-cloud connections
3. For most applications, data backup is sufficient
4. Schema changes are typically versioned in migrations anyway

---

## Setup Instructions

### For API-Based Backup (Recommended)

1. **Disable the old workflow**:
   - Go to `.github/workflows/backup-database.yml`
   - Add `if: false` to the job to disable it
   - Or delete the file

2. **The new workflow is ready**:
   - `.github/workflows/backup-database-api.yml` is already set up
   - Only needs 2 secrets: `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

3. **Test it**:
   - Go to Actions → "Daily Database Backup (API Method)"
   - Click "Run workflow"

### For PostgreSQL Backup (If needed)

Keep trying the existing workflow - it has fallback logic for IPv6 issues, but may still fail due to GitHub Actions network configuration.

---

## Migration Between Methods

### From SQL to JSON Backups
- No action needed
- Both can coexist
- Use whichever works

### From JSON to SQL Backups
- If you switch from API to PostgreSQL method
- Make sure direct database connection works first
- Test locally before relying on it

---

## Backup File Formats

### API Method (JSON)
```
backups/backup_2025-10-18_02-00-00.json.gz
backups/backup_2025-10-18_02-00-00_summary.json
```

### PostgreSQL Method (SQL)
```
backups/backup_2025-10-18_02-00-00.sql.gz
backups/backup_2025-10-18_02-00-00.json (metadata)
```

Both methods keep 30 days of backups and create daily automated backups at 2 AM UTC.
