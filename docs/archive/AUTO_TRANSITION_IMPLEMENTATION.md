# Auto-Transition Feature Implementation Summary

## What Was Implemented

### 1. **Admin Setting for Days Configuration**
   - Added `days_before_ongoing` field to admin_settings table
   - Default value: 30 days
   - Configurable range: 1-365 days (or 0 to disable)

### 2. **UI in Admin Portal Settings**
   - Input field to set number of days before transition
   - "Run Transition Now" button for manual triggering
   - Clear instructions and help text

### 3. **Supabase Edge Function**
   - `auto-transition-prayers` function
   - Automatically transitions prayers from "current" to "ongoing"
   - Only affects approved prayers older than the configured days
   - Returns count of transitioned prayers

### 4. **Database Migration**
   - Migration file: `006_add_days_before_ongoing.sql`
   - Adds column to admin_settings table

## Files Created/Modified

### Created Files:
1. `/supabase/migrations/006_add_days_before_ongoing.sql` - Database migration
2. `/supabase/functions/auto-transition-prayers/index.ts` - Edge function
3. `/AUTO_TRANSITION_GUIDE.md` - Complete documentation

### Modified Files:
1. `/src/components/EmailSettings.tsx`:
   - Added `daysBeforeOngoing` state
   - Added UI for days input
   - Added "Run Transition Now" button
   - Added `runAutoTransition()` function
   - Updated load and save functions to handle new setting

## How It Works

1. **Admin configures days** in Settings tab (e.g., 30 days)
2. **Edge function checks** for prayers that are:
   - Status: "current"
   - Approval status: "approved"
   - Created more than 30 days ago
3. **Transitions matching prayers** to "ongoing" status
4. **Can be triggered**:
   - Manually via "Run Transition Now" button
   - Automatically via cron job (needs to be set up separately)

## Next Steps for Deployment

1. **Apply the migration**:
   ```bash
   # Apply migration to add days_before_ongoing column
   ```

2. **Deploy the edge function**:
   ```bash
   supabase functions deploy auto-transition-prayers
   ```

3. **Set up automated execution** (optional but recommended):
   - Configure Supabase cron job, OR
   - Set up GitHub Actions workflow, OR
   - Use external cron service

4. **Configure in admin portal**:
   - Set desired number of days (default is 30)
   - Test with "Run Transition Now" button

## Testing

### Quick Test:
1. Go to Admin Portal → Settings
2. Set days to 1
3. Save settings
4. Create and approve a test prayer
5. Manually update its created_at to 2 days ago in database
6. Click "Run Transition Now"
7. Verify prayer changed to "ongoing"

## Benefits

- ✅ Keeps prayer list organized automatically
- ✅ No manual intervention needed
- ✅ Configurable by admins
- ✅ Can be disabled by setting to 0
- ✅ Manual trigger available for testing/immediate action
- ✅ Only affects approved prayers (not pending/denied)
