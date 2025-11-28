# Monitoring Supabase with Sentry (Free Tier)

Sentry is integrated to monitor your Supabase operations for errors. This setup is optimized for Sentry's free tier.

## Free Tier Features

✅ **Included (Unlimited):**
- Error tracking for all Supabase operations
- Full stack traces
- Error context and breadcrumbs
- Environment detection

❌ **Not Included (Limited to 10k/month):**
- Performance/transaction tracking removed to avoid quota limits
- Query timing metrics (would consume free tier quota quickly)

## Automatic Monitoring

The Supabase client already captures critical initialization errors automatically.

## Manual Monitoring (Optional)

For important database operations, you can wrap them with `monitorSupabaseQuery` to track performance and errors:

```typescript
import { supabase, monitorSupabaseQuery } from '../lib/supabase';

// Example: Monitor a critical query
const fetchPrayers = async () => {
  return await monitorSupabaseQuery(
    'fetch_active_prayers', // Operation name that appears in Sentry
    async () => {
      const { data, error } = await supabase
        .from('prayers')
        .select('*')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    }
  );
};
```

## What Gets Tracked

✅ **Errors captured (unlimited in free tier):**
- Database query failures
- Network/connection errors  
- Authentication errors
- Missing environment variables

✅ **Context included with each error:**
- Operation name
- Whether it's a network error
- Full stack trace
- Environment (production/development)

❌ **Not tracked (to preserve free tier quota):**
- Performance metrics
- Query execution time
- Transaction timing

## Where to View

1. Go to **https://sentry.io/**
2. Click **Issues** to see errors
3. Each error shows the Supabase operation that failed

Note: Performance tab requires paid plan - this setup focuses on error tracking only.

## Best Practices

- Wrap critical operations (user auth, data mutations)
- Use descriptive operation names like `'create_prayer'`, `'update_user'`
- Don't wrap every single query (only important ones)
- Network errors are automatically filtered to reduce noise

## Example: Auth Operation

```typescript
const verifyAdmin = async (password: string) => {
  return await monitorSupabaseQuery(
    'verify_admin_password',
    async () => {
      const { data, error } = await supabase
        .rpc('verify_admin_password', { input_password: password });
      
      if (error) throw error;
      return data;
    }
  );
};
```

This gives you visibility into which database operations are failing or running slowly in production.
