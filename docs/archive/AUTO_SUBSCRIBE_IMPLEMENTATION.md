# Email Subscribers Auto-Subscription & All Users Fix

## Changes Made ✅

### 1. Fixed "All Users" Email Distribution

**Problem**: When "Send Approved Prayer Emails To: All Users" was selected, it queried the `prayers` table for emails, which:
- Didn't respect user opt-in/opt-out preferences
- Sent emails to everyone who ever submitted a prayer

**Solution**: Now queries `email_subscribers` table with `is_active = true` filter

#### Files Changed:
- `src/lib/emailNotifications.ts`
  - `sendApprovedPrayerNotification()` - Line ~313
  - `sendApprovedUpdateNotification()` - Line ~376

#### Before:
```typescript
// Get all unique email addresses from prayers table
const { data: prayerEmails, error: prayerError } = await supabase
  .from('prayers')
  .select('email')
  .not('email', 'is', null)
  .neq('email', '');
```

#### After:
```typescript
// Get all active subscribers from email_subscribers table (respects opt-in/opt-out)
const { data: subscribers, error: subscribersError } = await supabase
  .from('email_subscribers')
  .select('email')
  .eq('is_active', true);
```

---

### 2. Auto-Subscribe Users When Submitting Prayers

**Feature**: When someone submits a prayer request, they are **automatically subscribed** to email notifications with `is_active = true` (opt-in by default).

**Benefits**:
- ✅ Users who care enough to submit prayers likely want updates
- ✅ They can opt-out anytime via Settings
- ✅ Respects existing subscriptions (doesn't duplicate)
- ✅ Sets `is_admin = false` to distinguish from admin subscribers

#### File Changed:
- `src/hooks/usePrayerManager.ts` - `addPrayer()` function

#### Implementation:
```typescript
// Auto-subscribe user to email notifications (opt-in by default)
if (prayer.email) {
  try {
    // Check if email already exists
    const { data: existing } = await supabase
      .from('email_subscribers')
      .select('id')
      .eq('email', prayer.email.toLowerCase().trim())
      .maybeSingle();

    // Only add if doesn't exist
    if (!existing) {
      await supabase
        .from('email_subscribers')
        .insert({
          name: prayer.requester,
          email: prayer.email.toLowerCase().trim(),
          is_active: true,  // Opt-in by default
          is_admin: false   // Regular user, not admin
        });
      console.log('✅ Auto-subscribed user to email notifications:', prayer.email);
    }
  } catch (subscribeError) {
    // Don't fail prayer submission if subscription fails
    console.error('Failed to auto-subscribe user:', subscribeError);
  }
}
```

---

## How It Works Now

### Prayer Submission Flow:
1. **User submits prayer** with email address
2. **Prayer inserted** into `prayers` table (pending approval)
3. **Auto-subscribe**: Email added to `email_subscribers` with `is_active = true`
4. **Admin notification** sent to admins
5. **Admin approves** prayer
6. **Broadcast email** sent based on distribution setting

### Email Distribution Settings:

#### Admin Only:
- Sends to emails in `admin_settings.notification_emails` array
- Admins manually added via Email Settings tab

#### All Users:
- Sends to **all active subscribers** in `email_subscribers` table
- Includes:
  - Auto-subscribed users (from prayer submissions)
  - Manually added subscribers (admins)
  - Users who opted-in via Settings
- Excludes:
  - Users who opted-out (`is_active = false`)

---

## User Opt-Out Flow

Users can opt-out at any time:

1. **Open Settings** (gear icon on main page)
2. **Scroll to Email Notification Preferences**
3. **Enter their email**
4. **Uncheck "Receive email notifications"**
5. **Click "Save Preferences"**
6. **Admin approves** opt-out request
7. **User no longer receives** broadcast emails

---

## Benefits

✅ **Respects User Preferences** - "All Users" now honors opt-in/opt-out  
✅ **Opt-In by Default** - Engaged users (prayer submitters) are subscribed  
✅ **Easy Opt-Out** - Users can unsubscribe via Settings  
✅ **No Duplicates** - Checks for existing subscriptions  
✅ **Graceful Degradation** - Prayer submission succeeds even if subscription fails  
✅ **Clear Distinction** - `is_admin` column separates admin vs user subscribers  

---

## Testing

### Test Auto-Subscription:
1. Submit a new prayer request with an email
2. Check `email_subscribers` table
3. Should see new row with:
   - `email` = submitted email
   - `name` = requester name
   - `is_active` = true
   - `is_admin` = false

### Test "All Users" Distribution:
1. Go to Admin Settings → Email Distribution
2. Select "All Users"
3. Approve a prayer
4. **Active subscribers** should receive email
5. **Inactive subscribers** should NOT receive email

### Test Opt-Out:
1. User enters email in Settings
2. Unchecks "Receive notifications"
3. Saves preferences
4. Admin approves
5. User's `is_active` set to `false`
6. Future broadcast emails skip this user

---

## Database Structure

### email_subscribers Table:
```sql
CREATE TABLE email_subscribers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Columns:
- **is_active**: Controls opt-in/opt-out (true = subscribed)
- **is_admin**: Distinguishes admin subscribers from users
- **email**: Unique constraint prevents duplicates

---

## Migration Notes

**No database migration required** - leverages existing `email_subscribers` table structure.

All changes are code-only! 🎉
