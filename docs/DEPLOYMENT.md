# Deployment Guide

Complete guide to deploying the Prayer App to production.

## Overview

**Frontend**: Static site (Vite build)  
**Backend**: Supabase (PostgreSQL + Edge Functions)  
**Hosting Options**: Vercel, Netlify, GitHub Pages, or any static host

## Prerequisites

- Production Supabase project
- Hosting account (Vercel/Netlify recommended)
- Domain verified in Resend (for production emails)
- Environment variables configured

## Production Checklist

### Before Deployment

- [ ] All migrations applied to production database
- [ ] Admin password changed from default
- [ ] Resend domain verified (see EMAIL.md)
- [ ] Environment variables configured
- [ ] Edge Functions deployed
- [ ] Build tested locally
- [ ] RLS policies verified

### After Deployment

- [ ] Test prayer submission
- [ ] Test email notifications
- [ ] Test admin portal access
- [ ] Verify realtime updates
- [ ] Monitor error logs
- [ ] Set up monitoring/alerts

## Environment Setup

### 1. Supabase Project

Create production project:

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note project URL and anon key
4. Apply all migrations (see DATABASE.md)

### 2. Environment Variables

Create `.env.production`:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Resend (for Edge Function)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
```

**Never commit `.env` files!** Add to `.gitignore`.

### 3. Resend Configuration

**Production requires verified domain**:

1. Add domain at [resend.com/domains](https://resend.com/domains)
2. Add DNS records to your domain provider
3. Wait for verification (can take hours)
4. Update Edge Function to use verified domain

**Update send-notification/index.ts**:

```typescript
// Remove test mode restrictions:
// - Remove recipient filtering
// - Remove "[TEST MODE]" from subjects
// - Use verified domain sender

const { data, error } = await resend.emails.send({
  from: 'noreply@yourdomain.com', // Use verified domain
  to: emailDetails.recipients,     // Use all recipients
  subject: emailDetails.subject,   // Remove [TEST MODE] prefix
  html: emailDetails.htmlContent
});
```

## Edge Functions Deployment

### Deploy All Functions

Use the provided script:

```bash
# Make executable
chmod +x deploy-functions.sh

# Deploy all functions
./deploy-functions.sh all
```

Or deploy individually:

```bash
./deploy-functions.sh send-notification
./deploy-functions.sh send-prayer-reminders
```

### Manual Deployment

#### send-notification

```bash
supabase functions deploy send-notification --no-verify-jwt

# Set environment variable
supabase secrets set RESEND_API_KEY=your_api_key
```

**Flags**:
- `--no-verify-jwt`: Allows anonymous invocation (required)

#### send-prayer-reminders

```bash
supabase functions deploy send-prayer-reminders

# Set environment variable
supabase secrets set RESEND_API_KEY=your_api_key
```

### Verify Deployment

```bash
# List deployed functions
supabase functions list

# Check function logs
supabase functions logs send-notification
```

## Frontend Deployment

### Build for Production

```bash
# Install dependencies
npm install

# Build
npm run build
```

Output in `dist/` directory.

### Vercel Deployment

#### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

#### Option 2: Git Integration

1. Push code to GitHub
2. Import to Vercel: [vercel.com/new](https://vercel.com/new)
3. Configure:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

**Auto-deploy on push**: Enabled by default

### Netlify Deployment

#### Option 1: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy

# Production
netlify deploy --prod
```

#### Option 2: Git Integration

1. Push code to GitHub
2. Import to Netlify: [app.netlify.com/start](https://app.netlify.com/start)
3. Configure:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
4. Add environment variables
5. Deploy

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### GitHub Pages

1. Install gh-pages:

```bash
npm install --save-dev gh-pages
```

2. Update `package.json`:

```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  },
  "homepage": "https://yourusername.github.io/prayerapp"
}
```

3. Deploy:

```bash
npm run deploy
```

4. Configure GitHub Pages:
   - Settings → Pages
   - Source: gh-pages branch

### Custom Server

For custom hosting:

```bash
# Build
npm run build

# Upload dist/ to your server
scp -r dist/* user@server:/var/www/prayerapp/

# Configure nginx/apache to serve static files
```

## Database Migration

### Apply Migrations to Production

**Option 1**: Supabase Dashboard

1. Go to SQL Editor
2. Copy migration file content
3. Run each migration in order (see DATABASE.md)

**Option 2**: Supabase CLI

```bash
# Link to production project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Or run specific migration
supabase db execute --file supabase/migrations/your_migration.sql
```

### Verify Migrations

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies;

-- Check constraints
SELECT conname, conrelid::regclass 
FROM pg_constraint 
WHERE contype = 'c';
```

## Configuration

### Admin Setup

1. Change default password:

```sql
UPDATE admin_settings 
SET admin_password = 'your_secure_password_here';
```

2. Set reminder interval:

```sql
UPDATE admin_settings 
SET reminder_interval_days = 7;
```

### Cron Jobs (Optional)

Set up scheduled functions in Supabase:

1. Dashboard → Database → Cron Jobs
2. Create job:

```sql
-- Send reminders weekly
SELECT cron.schedule(
  'send-weekly-reminders',
  '0 9 * * 1', -- Monday 9am
  $$
  SELECT net.http_post(
    url := 'https://xxxxx.supabase.co/functions/v1/send-prayer-reminders',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

**Note**: Auto-archiving of prayers is handled by the `send-prayer-reminders` function based on the `days_before_archive` setting.

## Monitoring

### Supabase Monitoring

Dashboard → Reports shows:
- API requests
- Database connections
- Storage usage
- Error rates

### Edge Function Logs

```bash
# Real-time logs
supabase functions logs send-notification --follow

# Specific time range
supabase functions logs send-notification --since 1h
```

### Error Tracking

**Option 1**: Supabase Dashboard → Logs

**Option 2**: Sentry Integration

```bash
npm install @sentry/react
```

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production"
});
```

### Uptime Monitoring

Recommended services:
- [UptimeRobot](https://uptimerobot.com)
- [Pingdom](https://www.pingdom.com)
- [Better Uptime](https://betteruptime.com)

Monitor:
- Main site: `https://yourdomain.com`
- API health: `https://xxxxx.supabase.co/rest/v1/prayers?limit=1`

## Performance Optimization

### Frontend

1. **Enable compression** in hosting config
2. **Add CDN** (Vercel/Netlify automatic)
3. **Optimize images** (use WebP, lazy loading)
4. **Code splitting** (already in Vite)

### Database

1. **Indexes**: Already created (see DATABASE.md)
2. **Connection pooling**: Supabase automatic
3. **Query optimization**: Use EXPLAIN ANALYZE

### Caching

Add cache headers in hosting config:

**Vercel** (`vercel.json`):

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**Netlify** (`netlify.toml`):

```toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

## Security

### Best Practices

- ✅ Never commit `.env` files
- ✅ Use strong admin password
- ✅ Enable RLS on all tables
- ✅ Validate input on client and server
- ✅ Use HTTPS (automatic on Vercel/Netlify)
- ✅ Limit Edge Function invocations
- ✅ Monitor for abuse

### Rate Limiting

Supabase includes automatic rate limiting:
- Anonymous: 10 requests/second
- Authenticated: 100 requests/second

For custom limits, use Edge Functions middleware.

## Rollback Procedures

### Frontend Rollback

**Vercel**: Dashboard → Deployments → Previous → Promote

**Netlify**: Deploys → Previous → Publish

**Git**: 
```bash
git revert HEAD
git push
```

### Database Rollback

Create rollback migrations:

```sql
-- Example: Rollback constraint change
ALTER TABLE status_change_requests 
DROP CONSTRAINT IF EXISTS status_change_requests_requested_status_check;

ALTER TABLE status_change_requests 
ADD CONSTRAINT status_change_requests_requested_status_check 
CHECK (requested_status IN ('active', 'answered', 'ongoing', 'closed'));
```

### Edge Function Rollback

```bash
# Redeploy previous version
cd supabase/functions/send-notification
git checkout HEAD~1 -- .
supabase functions deploy send-notification --no-verify-jwt
```

## Troubleshooting

### Build Failures

**Module not found**:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**TypeScript errors**:
```bash
npm run type-check
# Fix errors, then rebuild
```

### Deployment Issues

**Environment variables not loading**:
- Verify in hosting dashboard
- Restart deployment
- Check variable names match `.env`

**404 on routes**:
- Add SPA redirect rules (see hosting configs above)

### Database Connection

**Connection refused**:
- Check Supabase project status
- Verify URL and keys
- Check IP allowlist (if enabled)

**RLS blocking queries**:
- Run RLS fix migrations
- Verify policies in dashboard
- Check user permissions

### Email Not Sending

**Test mode restrictions**:
- Verify domain (see EMAIL.md)
- Update Edge Function to production mode
- Redeploy function

**Resend errors**:
- Check API key in secrets
- Verify sender domain
- Check rate limits

## Updates & Maintenance

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update
npm update

# Test
npm run build
npm run preview
```

### Database Maintenance

Supabase handles:
- Automatic backups (daily)
- Vacuum/analyze
- Index maintenance

Manual tasks:
- Review and clean old data
- Archive old records
- Monitor storage usage

## Support Resources

- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Netlify**: [docs.netlify.com](https://docs.netlify.com)
- **Resend**: [resend.com/docs](https://resend.com/docs)

---

**Next Steps**: See TROUBLESHOOTING.md for common issues and solutions.
