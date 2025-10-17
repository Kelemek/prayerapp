# Quick Debug Steps

## To check what's happening:

1. **Open your browser developer tools** (F12)
2. **Go to Console tab**
3. **Look at the prayer data being logged**

You should see something like:
```javascript
PrayerCard received prayer: {
  id: "...",
  title: "...", 
  requester: "...",
  is_anonymous: undefined,  // ← This tells us if migration was run
  is_anonymous_type: "undefined"
}
```

## What the values mean:

- `is_anonymous: true` = Migration run, prayer is anonymous ✅
- `is_anonymous: false` = Migration run, prayer is NOT anonymous ✅  
- `is_anonymous: undefined` = Migration NOT run yet ❌

## Next Steps:

### If migration NOT run:
1. Run the `migration-manual.sql` script in Supabase dashboard
2. Create a new prayer with anonymous checked
3. It should work properly

### If migration WAS run but still showing name:
1. The prayer was created before migration
2. You can manually update it in Supabase or delete and recreate it

## Temporary Fix:
I've updated the code to also check if requester name is "Anonymous" as a fallback.