# Database Migration Instructions

## Issue
The prayer_for field is not showing and anonymous names are still visible because the database schema hasn't been updated yet.

## Solution
You need to run the migration script to add the new fields to your database.

### Steps to Apply Migration:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Navigate to your project: `eqiafsygvfaifhoaewxi`

2. **Open SQL Editor**
   - In your project dashboard, click on "SQL Editor" in the left sidebar
   - Click "New Query" to create a new SQL query

3. **Run the Migration**
   - Copy the entire contents of `migration-manual.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the migration

4. **Verify the Migration**
   - After running, you should see output confirming the columns were added
   - You can verify by going to "Table Editor" > "prayers" and checking that these columns exist:
     - `email` (varchar, nullable)
     - `is_anonymous` (boolean, default false)
     - `prayer_for` (varchar, required, default 'General Prayer')

### What the Migration Does:
- Adds `email` field for optional contact information
- Adds `is_anonymous` boolean for privacy control
- Adds `prayer_for` mandatory field to specify who/what the prayer is for
- Creates indexes for better performance
- Updates existing records with default values

### After Migration:
- New prayer requests will require the "Prayer For" field
- Anonymous checkbox will properly hide the requester name
- Prayer cards will show "Prayer for: [specified person/thing]"
- Admin can see full details even for anonymous prayers

## Troubleshooting:
- If you get permission errors, make sure you're logged in as the project owner
- If columns already exist, the script will skip them safely
- The migration is designed to be run multiple times without issues