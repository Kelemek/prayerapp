# User Settings Feature

## Overview
Added a comprehensive user-facing settings modal that allows people to:
- Choose their theme preference (Light/Dark/System)
- Opt in or out of new prayer notifications
- Still receive emails about their own prayer submissions

## Database Changes

### New Table: `user_preferences`
Created migration: `20251016000000_create_user_preferences_table.sql`

**Fields:**
- `id` - UUID primary key
- `email` - User's email address (unique)
- `receive_new_prayer_notifications` - Boolean (default: true)
- `created_at` - Timestamp
- `updated_at` - Timestamp (auto-updated)

**Security:**
- Row Level Security (RLS) enabled
- Anyone can read, insert, and update preferences
- Indexed on email for fast lookups

## Frontend Changes

### New Component: `UserSettings.tsx`
Modal dialog for managing user preferences

**Features:**
- **Theme Selection**: Choose between Light, Dark, or System theme
  - Three-button grid layout with icons
  - Immediately applies theme changes
  - Persists preference to localStorage
- **Email Notifications**: 
  - Email input with validation
  - Load existing preferences
  - Save/update preferences
  - Toggle for new prayer notifications
- Clear success/error messages
- Info box explaining what notifications they'll always receive

**User Experience:**
1. Click settings gear icon in header
2. **Choose theme** (Light/Dark/System) - applies immediately
3. Enter email address (for notification preferences)
4. Click "Load" to fetch existing preferences (or use defaults)
5. Toggle "Receive new prayer notifications" checkbox
6. Click "Save Preferences" (saves email preferences only, theme is auto-saved)

### App.tsx Updates
- **Removed ThemeToggle component** from header (both mobile and desktop)
- **Added Settings icon button** to header (both mobile and desktop)
- Settings button styled with gray background
- Modal opens when clicked
- Theme hook still active for system theme detection

### Database Types
Updated `database.types.ts` to include:
- `user_preferences` table types
- `email_subscribers` table types (for admin email management)

## Email Notification Logic

### Users Will ALWAYS Receive:
✅ Approval notifications for prayers they submit
✅ Denial notifications for prayers they submit  
✅ Status change notifications for their prayers
✅ Update notifications for their prayers

### Users Can Opt Out Of:
❌ Notifications about NEW prayers submitted by OTHER people

## How To Use

### For Regular Users:
1. Click the settings gear icon in the header
2. **Theme Settings** (top section):
   - Click Light, Dark, or System button
   - Theme changes immediately
   - Preference saved automatically
3. **Email Notification Settings** (bottom section):
   - Enter your email address
   - Click "Load" to see current settings
   - Toggle notification preferences
   - Click "Save Preferences"

### For Admins:
- User preferences are stored independently
- Check the `user_preferences` table in Supabase
- When sending new prayer notifications, query this table to respect user preferences

## Integration Points

When implementing email notifications for new prayers, the system should:

```typescript
// Get users who want new prayer notifications
const { data: optedInUsers } = await supabase
  .from('user_preferences')
  .select('email')
  .eq('receive_new_prayer_notifications', true);

// Also get admin subscribers
const { data: adminEmails } = await supabase
  .from('email_subscribers')
  .select('email')
  .eq('is_active', true);

// Combine and deduplicate
const allRecipients = [...new Set([
  ...optedInUsers.map(u => u.email),
  ...adminEmails.map(a => a.email)
])];

// Send notification to allRecipients
```

## Migration Instructions

1. Apply the migration:
   ```sql
   -- Run in Supabase SQL Editor
   -- File: 20251016000000_create_user_preferences_table.sql
   ```

2. Test the feature:
   - Open the app
   - Click settings gear
   - Enter an email
   - Toggle preferences
   - Save and verify in database

## Notes

- Default is opted IN (receive_new_prayer_notifications = true)
- Users who haven't set preferences will receive all notifications
- Email addresses are stored lowercase for consistency
- Settings are per-email address (not per prayer request)
- Modal can be closed with Close button or X icon
- All form validation is client-side with clear error messages
