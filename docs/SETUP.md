# Setup Guide

Complete guide for setting up the Prayer App from scratch.

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Resend account (for email features)
- Git

## 1. Initial Setup

### Clone and Install

```bash
git clone <your-repo-url>
cd prayerapp
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from your Supabase project dashboard under Settings → API.

## 2. Database Setup

### Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for database to initialize (~2 minutes)

### 5. Run Database Migrations

In your Supabase SQL Editor, run these migrations **in this exact order**:

```bash
# All required migration files are in supabase/migrations/
```

**Order**:
1. **Core schema**: `supabase-schema.sql` - Creates all base tables
2. **Admin settings**: `create_admin_settings.sql` - Admin configuration
3. **Email subscribers**: `20251015000001_create_email_subscribers_table.sql`
4. **Pending preferences**: `20251016000001_create_pending_preference_changes.sql`
5. **Status changes**: `status-change-requests-migration.sql`
6. **RLS fix 1**: `fix_email_subscribers_rls.sql` ⚠️ Required for email preferences
7. **RLS fix 2**: `fix_pending_preference_changes_rls.sql` ⚠️ Required for email preferences
8. **⚠️ CRITICAL FIX**: `fix_status_change_constraint.sql` - Fixes status constraint

**These are the only 8 migration files you need.** Others have been archived.

### Link Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
```

## 3. Edge Functions Setup

### Deploy Functions

```bash
# Deploy all functions at once
./deploy-functions.sh

# Or deploy individually
supabase functions deploy send-notification --no-verify-jwt
supabase functions deploy send-prayer-reminders
supabase functions deploy auto-transition-prayers
```

### Configure Secrets

In Supabase Dashboard → Edge Functions → Secrets:

```
RESEND_API_KEY=your_resend_api_key
```

Get your Resend API key from [resend.com/api-keys](https://resend.com/api-keys).

## 4. Email Setup

See [EMAIL.md](EMAIL.md) for complete email configuration.

**Quick setup:**
1. Sign up at [resend.com](https://resend.com)
2. Get API key
3. Add to Edge Function secrets
4. (Optional) Verify domain for production

## 5. Run Development Server

```bash
npm run dev
```

App will be available at `http://localhost:5173`

## 6. Admin Access

### Create Admin User

In Supabase SQL Editor:

```sql
-- Add your email as admin
INSERT INTO email_subscribers (email, name, is_admin, is_active)
VALUES ('your-email@example.com', 'Your Name', true, true);
```

### Access Admin Portal

1. Go to your app
2. Click Settings icon (top right)
3. Click "Admin Login"
4. Use password from `admin_settings` table (or set your own)

## 7. Initial Configuration

In Admin Portal:

1. **Admin Settings Tab**:
   - Set admin password
   - Add notification emails
   - Configure reminder intervals

2. **Email Settings Tab**:
   - Add admin email subscribers
   - Configure email preferences

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues.

### Quick Fixes

**Can't access admin portal:**
- Check `admin_settings` table exists
- Verify admin password is set

**Database errors:**
- Check all migrations ran successfully
- Verify RLS policies are in place

**Email not working:**
- Check RESEND_API_KEY is set in Edge Functions
- See [EMAIL.md](EMAIL.md) for detailed troubleshooting

## Next Steps

- Read [FEATURES.md](FEATURES.md) to learn about all features
- Configure email system: [EMAIL.md](EMAIL.md)
- Deploy to production: [DEPLOYMENT.md](DEPLOYMENT.md)

## File Structure

```
prayerapp/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Supabase client, utilities
│   ├── types/          # TypeScript types
│   └── utils/          # Helper functions
├── supabase/
│   ├── functions/      # Edge Functions
│   └── migrations/     # SQL migrations
├── docs/               # Documentation
└── public/             # Static assets
```
