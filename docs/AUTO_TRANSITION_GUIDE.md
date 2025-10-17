# Auto-Transition Prayer Feature

## Overview
This feature automatically transitions prayers from "Current" status to "Ongoing" status after a specified number of days. This helps keep the prayer list organized by moving older prayers to the ongoing category.

## How It Works

### 1. Admin Configuration
- Admins can set the number of days before a prayer transitions in the Settings tab of the Admin Portal
- The setting is located in the "Auto-Transition to Ongoing" section
- Default value: 30 days
- Range: 1-365 days
- Set to 0 to disable auto-transition

### 2. Automatic Transition Logic
The system checks for prayers that meet ALL of these criteria:
- Status is "current"
- Approval status is "approved"
- Created date is older than the configured number of days

When prayers meet these criteria, they are automatically transitioned to "ongoing" status.

### 3. Manual Trigger
Admins can manually trigger the transition check by clicking the "Run Transition Now" button in the Settings tab. This is useful for:
- Testing the feature
- Running an immediate transition after changing the days setting
- Manually catching up on transitions

## Database Changes

### Migration File
`supabase/migrations/006_add_days_before_ongoing.sql`

Adds the `days_before_ongoing` column to the `admin_settings` table:
```sql
ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS days_before_ongoing INTEGER DEFAULT 30;
```

## Edge Function

### Function Location
`supabase/functions/auto-transition-prayers/index.ts`

### Function Logic
1. Fetches the `days_before_ongoing` setting from admin_settings
2. If disabled (0 or null), returns early
3. Calculates cutoff date (current date - days_before_ongoing)
4. Finds all prayers that are:
   - Status: "current"
   - Approval status: "approved"
   - Created before the cutoff date
5. Updates matching prayers to "ongoing" status
6. Returns count of transitioned prayers

### Invoking the Function
```typescript
const { data, error } = await supabase.functions.invoke('auto-transition-prayers');
```

Response format:
```json
{
  "message": "Successfully transitioned X prayers",
  "transitioned": 3,
  "prayers": [
    { "id": "uuid", "title": "Prayer Title" }
  ]
}
```

## Setting Up Automatic Execution

### Option 1: Supabase Cron (Recommended)
Set up a Supabase cron job to run the function daily:

1. In Supabase Dashboard, go to Database → Extensions
2. Enable the `pg_cron` extension
3. Run this SQL to schedule daily execution:

```sql
SELECT cron.schedule(
  'auto-transition-prayers-daily',
  '0 2 * * *', -- Run at 2 AM every day
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-transition-prayers',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);
```

### Option 2: External Cron Service
Use a service like:
- GitHub Actions with scheduled workflows
- Cron-job.org
- EasyCron
- Your own server's cron

Example GitHub Actions workflow:
```yaml
name: Auto Transition Prayers
on:
  schedule:
    - cron: '0 2 * * *' # 2 AM daily
jobs:
  transition:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            'https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-transition-prayers' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}'
```

### Option 3: Client-Side Trigger
For smaller deployments, trigger the function when admins log in:

```typescript
// In AdminPortal.tsx or similar
useEffect(() => {
  const checkAutoTransition = async () => {
    const lastRun = localStorage.getItem('lastAutoTransition');
    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    if (!lastRun || now - parseInt(lastRun) > oneDayMs) {
      await supabase.functions.invoke('auto-transition-prayers');
      localStorage.setItem('lastAutoTransition', now.toString());
    }
  };
  
  checkAutoTransition();
}, []);
```

## UI Components Modified

### EmailSettings.tsx
- Added state for `daysBeforeOngoing`
- Added input field for days configuration
- Added "Run Transition Now" button
- Added `runAutoTransition()` function

## Testing

### Test the Feature
1. Set `days_before_ongoing` to 1 in admin settings
2. Create a test prayer and approve it
3. Manually change the prayer's `created_at` to 2 days ago in the database:
   ```sql
   UPDATE prayers 
   SET created_at = NOW() - INTERVAL '2 days'
   WHERE id = 'your-prayer-id';
   ```
4. Click "Run Transition Now" in admin settings
5. Verify the prayer transitioned to "ongoing" status

### Verify the Function
```bash
# Test the edge function directly
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-transition-prayers' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

## Deployment Checklist

- [ ] Apply migration: `006_add_days_before_ongoing.sql`
- [ ] Deploy edge function: `auto-transition-prayers`
- [ ] Configure cron job (optional but recommended)
- [ ] Test with sample data
- [ ] Configure desired days in admin settings
- [ ] Document the feature for other admins

## Future Enhancements

Potential improvements:
- Email notifications when prayers are auto-transitioned
- Configurable transition for other status pairs (e.g., ongoing → answered)
- Dashboard showing transition history/statistics
- Different day settings for different prayer categories
- Batch transition logs for audit trail
