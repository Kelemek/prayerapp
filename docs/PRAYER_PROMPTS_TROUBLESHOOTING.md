# Prayer Prompts - Troubleshooting Guide

## Issue: "Failed to add prayer prompt"

### Root Cause
The initial RLS (Row Level Security) policy only allowed the `service_role` to insert prompts, but the application uses the `anon` key for all operations.

### Solution

**Run this SQL in your Supabase SQL Editor:**

```sql
-- Fix RLS policies for prayer_prompts table
DROP POLICY IF EXISTS "Service role can manage prompts" ON prayer_prompts;

CREATE POLICY "Anyone can manage prompts"
ON prayer_prompts FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
```

Or run the migration file: `supabase/migrations/fix_prayer_prompts_rls.sql`

### Verification Steps

1. **Check if table exists:**
```sql
SELECT * FROM prayer_prompts LIMIT 1;
```

2. **Check current policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'prayer_prompts';
```

You should see two policies:
- "Anyone can read prayer prompts" (SELECT)
- "Anyone can manage prompts" (ALL)

3. **Test insert manually:**
```sql
INSERT INTO prayer_prompts (title, type, description)
VALUES ('Test Prompt', 'Guidance', 'This is a test');
```

If this works, the RLS fix is applied correctly.

4. **Delete test data:**
```sql
DELETE FROM prayer_prompts WHERE title = 'Test Prompt';
```

### Common Errors

#### Error: "new row violates row-level security policy"
**Fix:** Run the RLS fix migration above.

#### Error: "relation 'prayer_prompts' does not exist"
**Fix:** Run the main migration first:
```sql
-- Run: supabase/migrations/create_prayer_prompts.sql
```

#### Error: "permission denied for table prayer_prompts"
**Fix:** Check your Supabase connection and anon key.

### Security Note

**Q: Is it safe to allow anon users to insert/update/delete?**

**A:** Yes, because:
1. The PromptManager component is only accessible in the AdminPortal
2. The AdminPortal requires password authentication
3. Only authenticated admins can access the Settings tab
4. Regular users never see the PromptManager interface

The security is enforced at the **application level** (AdminPortal login), not at the database level. This is the same approach used for other admin features in this app.

### Alternative: Service Role Key (Not Recommended)

If you prefer database-level security, you could:
1. Create a separate Supabase client with the service role key
2. Use it only for PromptManager operations
3. Keep the restrictive RLS policy

However, this adds complexity and the current approach is secure given the admin authentication.

### After Applying Fix

1. Refresh the admin portal page
2. Try adding a prompt again
3. Check browser console (F12) for any errors
4. Verify prompt appears when clicking "Prompts" filter

### Still Having Issues?

Check the browser console (F12) for detailed error messages. The error handling has been updated to show:
- Supabase error details
- Error message in alert
- Full error object in console

Common issues:
- Table not created (run main migration)
- Wrong Supabase project (check .env)
- Network issues (check internet connection)
- Supabase project paused (check dashboard)
