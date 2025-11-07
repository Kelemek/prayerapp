# Setup Guide

Complete guide for setting up the Prayer App from scratch.

---

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Microsoft 365 account (for email features)
- Git

---

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

Get these from your Supabase project dashboard under **Settings → API**.

---

## 2. Supabase Setup

### Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or sign in to your account
3. Click "New Project"
4. Fill in your project details:
   - **Name**: Church Prayer Manager (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select the region closest to your users
5. Wait for database to initialize (~2 minutes)

### Get Your Project Credentials

1. Go to **Settings → API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL** (like `https://abcdefghijklmnop.supabase.co`)
   - **Project API Key** (anon public key)
3. Update your `.env` file with these values

### Link Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
```

---

## 3. Database Setup

### Run Database Migrations

In your Supabase SQL Editor, run these migrations **in this exact order**:

```bash
# All required migration files are in supabase/migrations/
```

**Migration Order:**
1. **Core schema**: `supabase-schema.sql` - Creates all base tables
2. **Admin settings**: `create_admin_settings.sql` - Admin configuration
3. **Email subscribers**: `20251015000001_create_email_subscribers_table.sql`
4. **Pending preferences**: `20251016000001_create_pending_preference_changes.sql`
5. **Status changes**: `status-change-requests-migration.sql`
6. **RLS fix 1**: `fix_email_subscribers_rls.sql` ⚠️ Required for email preferences
7. **RLS fix 2**: `fix_pending_preference_changes_rls.sql` ⚠️ Required for email preferences
8. **⚠️ CRITICAL FIX**: `fix_status_change_constraint.sql` - Fixes status constraint

**These are the only 8 migration files you need.** Others have been archived.

### Database Schema Overview

The app uses these main tables:

#### `prayers`
- Stores prayer requests with title, description, category, status, and requester
- Automatically tracks creation and update timestamps
- Supports categories: healing, guidance, thanksgiving, protection, family, finances, salvation, missions, other
- Status options: active, ongoing, answered, closed

#### `prayer_updates`
- Stores updates/comments for each prayer request
- Linked to prayers via foreign key relationship
- Includes content, author, and timestamp

#### `email_subscribers`
- Stores email addresses for prayer notifications
- Includes admin flags and activity status
- Controls who receives prayer update emails

#### `admin_settings`
- Stores admin configuration (password, notification emails, etc.)
- Controls reminder intervals and email settings

#### `analytics`
- Tracks page views and usage statistics
- Anonymous tracking with RLS policies
- Only admins can read analytics data

---

## 4. Edge Functions Setup

### Deploy Functions

```bash
# Deploy all functions at once
./deploy-functions.sh

# Or deploy individually
supabase functions deploy send-notification --no-verify-jwt
supabase functions deploy send-prayer-reminders
supabase functions deploy auto-transition-prayers
```

### Configure Microsoft 365 SMTP Secrets

The app uses Microsoft 365 SMTP for email delivery instead of third-party services.

#### Create App Password in Microsoft 365

1. Go to https://portal.office.com
2. Sign in with your church's Microsoft 365 account
3. Click your profile → "My Account" → "Security"
4. Click "Additional security verification"
5. Select "App passwords"
6. Click "Create" and name it "Prayer App"
7. **Copy the password** - you won't see it again

#### Set Environment Variables in Supabase

If using a shared mailbox (e.g., `prayer@yourchurch.org`):

```bash
# Link to your Supabase project (if not already linked)
npx supabase link --project-ref your-project-ref

# Set SMTP credentials (service account authenticates, mail appears from shared mailbox)
npx supabase secrets set SMTP_HOST=smtp.office365.com
npx supabase secrets set SMTP_PORT=587
npx supabase secrets set SMTP_USER=service@yourchurch.org
npx supabase secrets set SMTP_PASS=your-app-password
npx supabase secrets set SMTP_FROM=prayer@yourchurch.org
```

**Important Notes:**
- `SMTP_USER` should be a licensed user (service account) that can authenticate
- `SMTP_FROM` should be the shared mailbox address you want recipients to see
- Grant "Send As" permission to the service account for the shared mailbox

#### Grant Send As Permission

In Exchange admin center (Shared mailboxes → Manage mailbox delegation → Send as) or via PowerShell:

```powershell
# After connecting with Connect-ExchangeOnline
Add-MailboxPermission -Identity "prayer@yourchurch.org" -User "service@yourchurch.org" -AccessRights SendAs
```

#### Email Rate Limits

The function automatically batches large sends:
- **30 emails per minute** (Microsoft 365 rate limit)
- **60 second delay** between batches
- For 150-200 recipients: will take 5-7 minutes total
- **Microsoft 365 Nonprofit**: 10,000 recipients/day limit

---

## 5. Planning Center Integration (Optional)

If you want to automatically lookup names from Planning Center when entering emails:

### Get Planning Center API Credentials

1. Visit https://api.planningcenteronline.com/oauth/applications
2. Log in with your Planning Center account
3. Create a new Personal Access Token:
   - Click "New Personal Access Token"
   - Name: "Prayer App"
   - Description: "Prayer request management with email lookup"
4. Copy your credentials:
   - **Application ID**
   - **Secret**
   
   ⚠️ **Save these somewhere safe!** You won't be able to see the secret again.

### Configure Planning Center Secrets

```bash
# Set the secrets
supabase secrets set PLANNING_CENTER_APP_ID="your-app-id-here"
supabase secrets set PLANNING_CENTER_SECRET="your-secret-here"
```

### Deploy Planning Center Function

```bash
supabase functions deploy planning-center-lookup
```

---

## 6. Analytics Setup (Optional)

The app tracks page views and displays analytics in the Admin Portal.

### Apply Analytics Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Create analytics table to track site usage
CREATE TABLE IF NOT EXISTS analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for performance
CREATE INDEX idx_analytics_event_type ON analytics(event_type);
CREATE INDEX idx_analytics_created_at ON analytics(created_at);

-- Enable RLS
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert analytics (tracking page views)
CREATE POLICY "Allow anonymous inserts" ON analytics
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users (admins) can read analytics
CREATE POLICY "Allow authenticated reads" ON analytics
  FOR SELECT TO authenticated
  USING (true);
```

### Analytics Features

- Automatically tracks every page load
- Admin dashboard shows stats: Today, This Week, This Month, All Time
- Anonymous tracking with RLS policies
- No personally identifiable information stored

---

## 7. Run Development Server

```bash
npm run dev
```

App will be available at `http://localhost:5173`

---

## 8. Admin Access

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

---

## 9. Initial Configuration

In Admin Portal:

### Admin Settings Tab
- Set admin password
- Add notification emails
- Configure reminder intervals
- View analytics (if enabled)

### Email Settings Tab
- Add admin email subscribers
- Configure email preferences
- Manage subscriber list

---

## 10. Test the Setup

### Test Database Connection
1. Open the app
2. Try adding a new prayer request
3. Verify it appears in the list

### Test Real-time Features
1. Open the app in two different browser windows
2. Add a prayer request in one window
3. You should see it appear in the other window automatically

### Test Email Function
1. Open your admin portal
2. Try sending an admin invite email
3. Check Supabase Functions logs for any errors:
   - Go to Supabase Dashboard → Edge Functions → send-notification → Logs

---

## Security Notes

- Row Level Security (RLS) is enabled on all tables
- Anonymous users can only INSERT analytics (track views)
- Only authenticated admins can READ analytics data
- Admin portal requires password authentication
- For production use, review and customize RLS policies as needed

---

## Troubleshooting

### Connection Error Message
- Verify your `.env` file has the correct Supabase URL and API key
- Make sure there are no extra spaces or quotes around the values
- Restart your development server after changing environment variables

### Missing Tables Error
- Make sure you ran all migrations in the correct order
- Check that tables were created in the **Table Editor** section

### Real-time Not Working
- Ensure your Supabase project has real-time enabled (it's on by default)
- Check the browser console for any WebSocket connection errors

### Email Service Not Configured Error
- Check that all SMTP environment variables are set in Supabase
- Verify the app password is correct
- Check Microsoft 365 security settings

### Emails Not Arriving
- Check spam folders
- Verify recipient email addresses are correct
- Check Microsoft 365 admin center for blocked sends
- Ensure "Send As" permission is granted for shared mailboxes

### Can't Access Admin Portal
- Check `admin_settings` table exists
- Verify admin password is set
- Ensure your email is marked as `is_admin = true` in `email_subscribers`

For more troubleshooting help, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## Next Steps

Once everything is working:

1. **Customize Settings**: Configure admin password, notification preferences, and reminder intervals
2. **Add Subscribers**: Build your email subscriber list for prayer notifications
3. **Deploy to Production**: Deploy your app to Vercel, Netlify, or Supabase hosting
4. **Share with Community**: Share the app URL with your church community
5. **Monitor Usage**: Check analytics in the Admin Portal to track engagement

---

## Support Resources

- [Supabase Documentation](https://docs.supabase.com)
- [Microsoft 365 Admin Center](https://admin.microsoft.com)
- [Planning Center API Docs](https://developer.planning.center/docs)
- Project documentation in `docs/` folder
