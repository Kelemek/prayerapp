# Fixed: 403 Forbidden Error on Edge Function

## The Problem

Edge Function was returning **403 Forbidden** because function calls were missing authentication headers:

```
Failed to load resource: the server responded with a status of 403 (Forbidden)
FunctionsHttpError: Edge Function returned a non-2xx status code
```

## Root Cause

Supabase Edge Functions require authentication by default. All invocations were missing the `Authorization` header with the anon key.

## The Fix ✅

**Created a helper function** in `src/lib/emailNotifications.ts`:

```typescript
async function invokeSendNotification(payload: { 
  to: string[]; 
  subject: string; 
  body: string; 
  html?: string 
}) {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return await supabase.functions.invoke('send-notification', {
    body: payload,
    headers: {
      Authorization: `Bearer ${anonKey}`
    }
  });
}
```

**Updated all 11 invocations** to use this helper instead of calling `supabase.functions.invoke()` directly.

## What Changed

- ✅ All Edge Function calls now include proper authentication
- ✅ Uses public anon key (appropriate for public forms)
- ✅ Centralized in one helper function (easier to maintain)
- ✅ No TypeScript errors

## Test It

1. Hard refresh your browser: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)
2. Submit a preference change from the main site
3. Check console - no more 403 errors! ✅
4. Admin should receive approval email 📧

## Why Anon Key?

Users submitting preferences aren't logged in, so we use the **anon key** which is:
- Safe to use in frontend code
- Already public (in your HTML)
- Correct for public API calls
- Restricted by Row Level Security (RLS) policies

Your Edge Function and database RLS policies control what the anon key can do.

## Result

🎉 **Email notifications will work now!**
