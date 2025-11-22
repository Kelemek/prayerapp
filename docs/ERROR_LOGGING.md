# Error Logging and Monitoring Guide

## Overview

The Prayer App includes comprehensive error logging that automatically captures and reports errors to:

1. **Vercel Function Logs** - Visible in your Vercel dashboard
2. **Browser Console** - For development debugging
3. **External Services** - Datadog, Sentry (when configured)

## How Errors Are Logged

### Automatic Logging

The app automatically captures:
- **Uncaught JavaScript errors** - Logged via global error event listener
- **Unhandled promise rejections** - Captured and logged with context
- **Page views** - Tracked for user journey context
- **Service worker errors** - Logged when they occur

### Manual Logging

Use the error logger in your code:

```typescript
import { logError, logWarning, logInfo } from '@/lib/errorLogger';

// Log an error
logError({
  message: 'Failed to load prayers',
  error: someError,
  context: {
    userId: user?.id,
    tags: { component: 'PrayerList' }
  }
});

// Log a warning
logWarning('High memory usage detected', {
  pathname: window.location.pathname
});

// Log info
logInfo('User navigated to admin portal', {
  userId: user?.id
});
```

## Viewing Logs in Vercel

### Production Logs

1. Go to https://vercel.com/dashboard
2. Select your project (prayerapp)
3. Click **Deployments** tab
4. Click on an active deployment
5. Go to **Logs** tab
6. Search for `[Prayer App Error]`

### Real-time Logs

```bash
# Install Vercel CLI
npm i -g vercel

# View logs in real-time
vercel logs --follow
```

## Example: Catching Crashes

### Before (No Logging)
```typescript
try {
  const data = await fetchPrayers();
  setPrayers(data);
} catch (error) {
  console.error('Error:', error);
}
```

### After (With Logging)
```typescript
import { logError, withErrorLogging } from '@/lib/errorLogger';

// Option 1: Manual logging
try {
  const data = await fetchPrayers();
  setPrayers(data);
} catch (error) {
  logError({
    message: 'Failed to fetch prayers',
    error,
    context: {
      userId: currentUser?.id,
      tags: { component: 'PrayerManager' },
      metadata: { prayerCount: prayers.length }
    }
  });
}

// Option 2: Using wrapper
const data = await withErrorLogging(
  () => fetchPrayers(),
  'Failed to fetch prayers',
  { userId: currentUser?.id }
);
```

## Log Payload Structure

Each error log includes:

```javascript
{
  severity: "ERROR",           // ERROR, WARNING, INFO
  message: "Error description",
  error: "Actual error message",
  stack: "Stack trace...",
  context: {
    timestamp: "2025-11-21T18:30:45.123Z",
    pathname: "/admin",
    userAgent: "Mozilla/5.0...",
    userId: "user-123",
    email: "user@example.com",
    tags: {
      component: "PrayerForm",
      action: "submit"
    },
    metadata: {
      attempt: 1,
      retryable: true
    }
  },
  environment: "production"
}
```

## Integrating with External Services

### Datadog

1. Install Datadog RUM:
```bash
npm install @datadog/browser-rum
```

2. Initialize in `main.tsx`:
```typescript
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: 'YOUR_APP_ID',
  clientToken: 'YOUR_CLIENT_TOKEN',
  site: 'datadoghq.com',
  service: 'prayer-app',
  env: 'production',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
});

datadogRum.startSessionReplayRecording();
```

The error logger will automatically detect and use Datadog's RUM SDK.

### Sentry

1. Install Sentry:
```bash
npm install @sentry/react
```

2. Initialize in `main.tsx`:
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: 'production',
  tracesSampleRate: 0.1,
});
```

The error logger will automatically detect and use Sentry.

## Common Scenarios

### Site Won't Load
1. Check Vercel logs for errors
2. Search for: `[Prayer App Error]` or `Uncaught error`
3. Look for Supabase connection errors
4. Check browser console for details

### Intermittent Crashes
1. Set `context.userId` to identify affected users
2. Search logs by user in Vercel dashboard
3. Add custom tags to errors for filtering
4. Track pattern of crashes by time/feature

### Email Sending Failures
```typescript
logError({
  message: 'Email verification failed',
  error,
  context: {
    userId: user?.id,
    email: recipientEmail,
    tags: {
      feature: 'email-verification',
      provider: 'resend'
    },
    metadata: {
      emailType: 'magic-link',
      templateId: 'sign-in'
    }
  }
});
```

### Database Errors
```typescript
logError({
  message: 'Supabase query failed',
  error,
  context: {
    tags: {
      table: 'prayers',
      operation: 'select',
      rls: 'enabled'
    }
  }
});
```

## Search and Filter in Vercel Logs

```
# Find all errors
[Prayer App Error]

# Find specific component errors
[Prayer App Error] component: PrayerForm

# Find errors for a user
userId: user-123

# Find by severity
ERROR|WARNING

# Find recent errors
since:1h

# Find performance issues
renderTime > 5000
```

## Performance Monitoring

Log performance metrics on page load:

```typescript
import { logPerformanceMetrics } from '@/lib/errorLogger';

useEffect(() => {
  // Log metrics when page fully loads
  window.addEventListener('load', () => {
    logPerformanceMetrics();
  });
}, []);
```

## Best Practices

1. **Always include context**: User ID, affected component, action taken
2. **Use meaningful messages**: "Failed to save prayer" not "Error"
3. **Log early, log often**: Catch errors close to where they occur
4. **Include metadata**: Attempt count, retry status, data size
5. **Don't log sensitive data**: Avoid passwords, tokens, full email chains
6. **Use tags for filtering**: Makes searching logs easier
7. **Set severity appropriately**: Not everything is an ERROR

## Troubleshooting

### Logs not appearing in Vercel

1. Verify you're logged into Vercel with correct project
2. Check that errors are actually being thrown
3. Ensure `setupGlobalErrorHandling()` is called
4. Check browser console for errors in error handler

### Datadog/Sentry not capturing errors

1. Verify SDK is installed and initialized
2. Check that DSN/tokens are correct
3. Verify environment is set to "production"
4. Check Datadog/Sentry dashboard for incoming events

### Too many error logs

1. Add filters in Vercel logs
2. Use sample rate in external services
3. Consider rate limiting for non-critical errors
4. Archive old logs in external services

## Resources

- [Vercel Logs Documentation](https://vercel.com/docs/observability/logs)
- [Datadog RUM Documentation](https://docs.datadoghq.com/real_user_monitoring/)
- [Sentry Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
