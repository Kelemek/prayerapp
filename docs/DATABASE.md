# Database Guide

Complete guide to the Prayer App database schema, migrations, and Row Level Security (RLS) policies.

## Database Overview

**Platform**: Supabase (PostgreSQL)  
**Location**: `supabase/migrations/`

### Core Tables

1. **prayers** - Prayer requests
2. **prayer_updates** - Updates on prayers
3. **deletion_requests** - Prayer/update deletion requests
4. **update_deletion_requests** - Specific update deletion requests
5. **status_change_requests** - Prayer status change requests
6. **email_subscribers** - Email notification subscribers
7. **pending_preference_changes** - Pending email preference changes
8. **admin_settings** - Admin configuration

## Schema Details

### prayers

Primary table for all prayer requests.

```sql
CREATE TABLE prayers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'current' 
    CHECK (status IN ('current', 'ongoing', 'answered', 'closed')),
  requester TEXT NOT NULL,
  email VARCHAR(255),
  is_anonymous BOOLEAN DEFAULT false,
  date_requested TIMESTAMPTZ DEFAULT NOW(),
  date_answered TIMESTAMPTZ,
  approval_status TEXT DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'denied')),
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields**:
- `status`: current, ongoing, answered, closed
- `approval_status`: pending (default), approved, denied
- `is_anonymous`: Hide requester name in UI
- `denial_reason`: Admin reason if denied

**Indexes**:
- `idx_prayers_status` on `status`
- `idx_prayers_approval` on `approval_status`
- `idx_prayers_email` on `email`

### prayer_updates

Updates/testimonies for prayers.

```sql
CREATE TABLE prayer_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  author_email VARCHAR(255),
  is_anonymous BOOLEAN DEFAULT false,
  approval_status TEXT DEFAULT 'pending',
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Cascade Delete**: Updates deleted when prayer is deleted.

### deletion_requests

Requests to delete prayers.

```sql
CREATE TABLE deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
  reason TEXT,
  requested_by TEXT NOT NULL,
  requested_email VARCHAR(255),
  approval_status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### status_change_requests

Requests to change prayer status.

```sql
CREATE TABLE status_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
  requested_status VARCHAR(20) NOT NULL 
    CHECK (requested_status IN ('current', 'answered', 'ongoing', 'closed')),
  reason TEXT,
  requested_by VARCHAR(255) NOT NULL,
  requested_email VARCHAR(255),
  approval_status VARCHAR(20) DEFAULT 'pending',
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Important**: Constraint uses 'current' not 'active' (fixed in migration).

### email_subscribers

Email notification subscribers list (approved).

```sql
CREATE TABLE email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  is_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields**:
- `is_admin`: Receives admin notifications
- `is_active`: Currently subscribed (opt-in/out)

### pending_preference_changes

User-submitted email preference changes awaiting approval.

```sql
CREATE TABLE pending_preference_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  receive_new_prayer_notifications BOOLEAN NOT NULL,
  approval_status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Workflow**:
1. User submits preference in Settings
2. Record created with `approval_status='pending'`
3. Admin reviews in Admin Portal
4. On approval: Record created/updated in `email_subscribers`
5. On denial: User notified

### admin_settings

Single-row table for admin configuration.

```sql
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_password TEXT DEFAULT 'prayer2024',
  reminder_interval_days INTEGER DEFAULT 7,
  enable_reminders BOOLEAN DEFAULT false,
  enable_auto_archive BOOLEAN DEFAULT false,
  days_before_archive INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Default Values**:
- Password: `prayer2024` (change immediately!)
- Reminder interval: 7 days
- Auto-archive: disabled (7 days after reminder when enabled)

## Row Level Security (RLS)

All tables have RLS enabled for security.

### Key Policies

#### prayers

```sql
-- Anyone can view approved prayers
CREATE POLICY "Anyone can view approved prayers"
ON prayers FOR SELECT
TO anon, authenticated
USING (approval_status = 'approved');

-- Anyone can insert prayers (go to pending)
CREATE POLICY "Anyone can insert prayers"
ON prayers FOR INSERT
TO anon, authenticated
WITH CHECK (true);
```

#### email_subscribers

```sql
-- Anyone can read subscribers (for loading preferences)
CREATE POLICY "Anyone can read email subscribers"
ON email_subscribers FOR SELECT
TO anon, authenticated
USING (true);
```

**Location**: `supabase/migrations/fix_email_subscribers_rls.sql`

#### pending_preference_changes

```sql
-- Anyone can insert preference changes
CREATE POLICY "Anyone can insert preference changes"
ON pending_preference_changes FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Anyone can read their own preferences
CREATE POLICY "Anyone can read their own preference changes"
ON pending_preference_changes FOR SELECT
TO anon, authenticated
USING (true);
```

**Location**: `supabase/migrations/fix_pending_preference_changes_rls.sql`

## Migrations

All migration files are in `supabase/migrations/`. **Only 8 files are required** (others archived).

### Migration Order

Run these migrations **in this exact order**:

1. **`supabase-schema.sql`** - Core schema (all base tables)
2. **`create_admin_settings.sql`** - Admin settings table
3. **`20251015000001_create_email_subscribers_table.sql`** - Email subscribers
4. **`20251016000001_create_pending_preference_changes.sql`** - Preference changes
5. **`status-change-requests-migration.sql`** - Status change requests
6. **`fix_email_subscribers_rls.sql`** - RLS for email_subscribers ⚠️
7. **`fix_pending_preference_changes_rls.sql`** - RLS for pending_preference_changes ⚠️
8. **`fix_status_change_constraint.sql`** - Fix 'active' → 'current' ⚠️ **CRITICAL**

All other migration files in `archive/` are obsolete and not needed.

### Critical Migrations

#### fix_status_change_constraint.sql

**Must run** to fix constraint from 'active' to 'current':

```sql
ALTER TABLE status_change_requests 
DROP CONSTRAINT IF EXISTS status_change_requests_requested_status_check;

ALTER TABLE status_change_requests 
ADD CONSTRAINT status_change_requests_requested_status_check 
CHECK (requested_status IN ('current', 'answered', 'ongoing', 'closed'));
```

**Why**: Original migration had 'active' but app uses 'current'.

## Triggers

### updated_at Triggers

All tables have auto-updating `updated_at` timestamps:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prayers_updated_at 
BEFORE UPDATE ON prayers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Applied to:
- prayers
- status_change_requests
- email_subscribers
- pending_preference_changes
- admin_settings

## Indexes

### Performance Indexes

```sql
-- prayers
CREATE INDEX idx_prayers_status ON prayers(status);
CREATE INDEX idx_prayers_approval ON prayers(approval_status);
CREATE INDEX idx_prayers_email ON prayers(email);
CREATE INDEX idx_prayers_created_at ON prayers(created_at DESC);

-- status_change_requests
CREATE INDEX idx_status_change_requests_prayer_id 
  ON status_change_requests(prayer_id);
CREATE INDEX idx_status_change_requests_approval_status 
  ON status_change_requests(approval_status);
CREATE INDEX idx_status_change_requests_created_at 
  ON status_change_requests(created_at DESC);

-- email_subscribers
CREATE INDEX idx_email_subscribers_email 
  ON email_subscribers(email);
CREATE INDEX idx_email_subscribers_is_active 
  ON email_subscribers(is_active);
```

## Realtime Subscriptions

Tables with realtime enabled:
- ✅ prayers
- ✅ prayer_updates
- ✅ deletion_requests
- ✅ status_change_requests

**Setup**: Automatic in Supabase

**Usage in App**: See `src/hooks/usePrayerManager.ts`

## Database Queries

### Common Patterns

#### Get Approved Prayers

```sql
SELECT * FROM prayers 
WHERE approval_status = 'approved' 
  AND status = 'current'
ORDER BY created_at DESC;
```

#### Get Pending Requests

```sql
SELECT * FROM status_change_requests 
WHERE approval_status = 'pending'
ORDER BY created_at ASC;
```

#### Get Active Subscribers

```sql
SELECT * FROM email_subscribers 
WHERE is_active = true 
  AND is_admin = false;
```

#### Check User Preferences

```sql
-- Check pending
SELECT * FROM pending_preference_changes
WHERE email = 'user@example.com'
  AND approval_status = 'pending'
ORDER BY created_at DESC
LIMIT 1;

-- Check approved
SELECT * FROM email_subscribers
WHERE email = 'user@example.com';
```

## Backup & Restore

### Export Data

In Supabase Dashboard:
1. Table Editor → Select table
2. Export → CSV/JSON
3. Save locally

### Restore Data

```sql
-- Example: Restore prayers
COPY prayers FROM '/path/to/prayers.csv' 
DELIMITER ',' CSV HEADER;
```

### Full Database Backup

Use `pg_dump`:

```bash
pg_dump -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  --no-owner \
  --no-acl \
  -f backup.sql
```

## Maintenance

### Clean Up Old Records

```sql
-- Delete old denied requests (> 30 days)
DELETE FROM deletion_requests 
WHERE approval_status = 'denied' 
  AND created_at < NOW() - INTERVAL '30 days';

DELETE FROM status_change_requests 
WHERE approval_status = 'denied' 
  AND created_at < NOW() - INTERVAL '30 days';
```

### Vacuum & Analyze

Supabase handles this automatically, but you can manually:

```sql
VACUUM ANALYZE prayers;
VACUUM ANALYZE prayer_updates;
```

## Troubleshooting

### Common Issues

**Can't read from table**:
- Check RLS policies
- Run RLS fix migrations
- Verify user permissions

**Constraint violations**:
- Check status values ('current' not 'active')
- Verify approval_status values
- Run `fix_status_change_constraint.sql`

**Slow queries**:
- Check indexes exist
- Run EXPLAIN ANALYZE
- Add missing indexes

### Debug Queries

```sql
-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'email_subscribers';

-- Check constraints
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'status_change_requests'::regclass;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'prayers';
```

## Best Practices

### Schema Changes

- ✅ Always create migration file
- ✅ Test in development first
- ✅ Include rollback commands
- ✅ Update RLS policies if needed

### Data Integrity

- ✅ Use foreign key constraints
- ✅ Add CHECK constraints for enums
- ✅ Set appropriate defaults
- ✅ Use NOT NULL where required

### Performance

- ✅ Index frequently queried columns
- ✅ Use LIMIT on large queries
- ✅ Avoid SELECT *
- ✅ Use covering indexes where possible

---

**More Info**:
- [Supabase Database Docs](https://supabase.com/docs/guides/database)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
