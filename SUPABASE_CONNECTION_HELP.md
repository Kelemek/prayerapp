# Supabase Database Access Configuration

If you're getting connection errors from GitHub Actions, you may need to enable direct database access in Supabase.

## Enable Direct Database Connection

1. **Go to your Supabase Dashboard**
   - https://supabase.com/dashboard

2. **Select your project** (eqiafsygvfaifhoaewxi)

3. **Go to Settings**
   - Click Settings (gear icon) in the left sidebar

4. **Navigate to Database**
   - Click **Database** in the settings menu

5. **Check Connection Pooling Settings**
   - Look for "Connection Pooling" or "Direct Connection" section
   - Make sure direct connections are enabled

6. **Check Network Restrictions**
   - Scroll to "Network Restrictions" or "Connection Configuration"
   - Ensure **no IP restrictions** are blocking GitHub Actions IPs
   - Or add GitHub Actions IP ranges if needed

## Alternative: Use Connection String

If direct connection doesn't work, you can also try:

### Using Connection Pooler (Port 6543)
The workflow now tries port 6543 first (connection pooler), which is designed for external connections and should work better from GitHub Actions.

### Check Database Password
Make sure the password you set in GitHub Secrets is correct:
1. Go to Supabase → Settings → Database
2. Under "Database Settings", you can reset the password if needed
3. Update the `SUPABASE_DB_PASSWORD` secret in GitHub

## Troubleshooting

### Connection timeout or "Network is unreachable"
- **Issue**: IPv6 connectivity problem or firewall
- **Solution**: The workflow now disables IPv6 and tries multiple connection methods

### "password authentication failed"
- **Issue**: Wrong password in secrets
- **Solution**: Double-check `SUPABASE_DB_PASSWORD` in GitHub Secrets

### "could not translate host name"
- **Issue**: DNS resolution problem
- **Solution**: The workflow now tries multiple DNS methods

### "no pg_hba.conf entry"
- **Issue**: Database access restrictions
- **Solution**: Check Supabase network restrictions settings

## GitHub Actions IP Ranges

If you need to whitelist GitHub Actions IPs:
- GitHub Actions uses dynamic IPs from Azure data centers
- You can find the current IP ranges at: https://api.github.com/meta
- However, Supabase typically allows all connections by default

## Testing Locally

To test if your database is accessible:

```bash
# Test connection using psql (port 6543)
psql "postgresql://postgres:[YOUR-PASSWORD]@db.eqiafsygvfaifhoaewxi.supabase.co:6543/postgres"

# Test connection using psql (port 5432)
psql "postgresql://postgres:[YOUR-PASSWORD]@db.eqiafsygvfaifhoaewxi.supabase.co:5432/postgres"
```

If these work locally but not in GitHub Actions, it's likely a network connectivity issue specific to GitHub's infrastructure.

## Last Resort: Alternative Backup Method

If direct database access from GitHub Actions continues to fail, you can:

1. **Use Supabase CLI Backup** (requires different setup)
2. **Schedule backups from a VPS** instead of GitHub Actions
3. **Use Supabase's built-in backup feature** (paid plans)
4. **Run backups locally** and commit them manually

For now, let's try running the workflow again with the improved connection logic!
