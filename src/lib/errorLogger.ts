/**
 * Error logging utility for tracking errors across the application
 * Logs to:
 * - Browser console (development & production)
 * - Vercel's logging system (via console)
 * - External error tracking services (extensible)
 */

export interface ErrorLogContext {
  userId?: string;
  email?: string;
  pathname?: string;
  userAgent?: string;
  timestamp?: string;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface ErrorInfo {
  message: string;
  error?: Error | unknown;
  context?: ErrorLogContext;
  severity?: 'error' | 'warning' | 'info';
}

/**
 * Log an error with context information
 * This will appear in:
 * - Vercel Function Logs
 * - Vercel Deployments -> Logs
 * - Datadog/Sentry (if integrated)
 */
export const logError = (info: ErrorInfo): void => {
  const {
    message,
    error,
    context = {},
    severity = 'error'
  } = info;

  // Extract error details
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Build log context
  const logContext: ErrorLogContext = {
    timestamp: new Date().toISOString(),
    pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    ...context
  };

  // Build the log message
  const logPayload = {
    severity: severity.toUpperCase(),
    message,
    error: errorMessage,
    stack: errorStack,
    context: logContext,
    environment: import.meta.env.MODE
  };

  // Always log to console (visible in Vercel logs)
  const consoleMethod = severity === 'error' ? console.error : severity === 'warning' ? console.warn : console.log;
  consoleMethod('[Prayer App Error]', JSON.stringify(logPayload, null, 2));

  // Also log the raw error for better Vercel integration
  if (error instanceof Error) {
    consoleMethod(`Stack trace: ${error.stack}`);
  }

  // Track in browser console for debugging
  if (severity === 'error') {
    console.error(`[${logContext.timestamp}] ${message}`, error);
  }

  // Send to external error tracking if available (Datadog, Sentry, etc.)
  try {
    sendToErrorTracking(logPayload);
  } catch (trackingError) {
    // Silently fail if external tracking isn't available
    console.debug('Failed to send error to tracking service:', trackingError);
  }
};

/**
 * Log a warning message
 */
export const logWarning = (message: string, context?: ErrorLogContext): void => {
  logError({
    message,
    context,
    severity: 'warning'
  });
};

/**
 * Log an info message
 */
export const logInfo = (message: string, context?: ErrorLogContext): void => {
  logError({
    message,
    context,
    severity: 'info'
  });
};

/**
 * Wrapper for async operations with automatic error logging
 */
export const withErrorLogging = async <T>(
  fn: () => Promise<T>,
  errorMessage: string,
  context?: ErrorLogContext
): Promise<T | null> => {
  try {
    return await fn();
  } catch (error) {
    logError({
      message: errorMessage,
      error,
      context
    });
    return null;
  }
};

/**
 * Log page view and diagnostic information
 * Useful for tracking user journeys before crashes
 */
export const logPageView = (pageName: string): void => {
  const context: ErrorLogContext = {
    timestamp: new Date().toISOString(),
    pathname: window.location.pathname,
    tags: {
      page: pageName,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    },
    metadata: {
      url: window.location.href,
      referrer: document.referrer,
      memory: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null
    }
  };

  console.log('[Page View]', JSON.stringify(context, null, 2));
};

/**
 * Log unhandled promise rejections
 * Call this in App.tsx during initialization
 */
export const setupGlobalErrorHandling = (): void => {
  // Handle uncaught errors
  window.addEventListener('error', (event: ErrorEvent) => {
    logError({
      message: 'Uncaught error',
      error: event.error,
      context: {
        tags: {
          type: 'uncaught_error'
        }
      }
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    logError({
      message: 'Unhandled promise rejection',
      error: event.reason,
      context: {
        tags: {
          type: 'unhandled_rejection'
        }
      }
    });
  });

  // Log if service worker fails
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('error', (event: ErrorEvent) => {
      logError({
        message: 'Service worker error',
        error: event.error,
        context: {
          tags: {
            type: 'service_worker_error'
          }
        }
      });
    });
  }
};

/**
 * Log performance metrics
 */
export const logPerformanceMetrics = (): void => {
  if (typeof window === 'undefined') return;

  try {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const connectTime = perfData.responseEnd - perfData.requestStart;
    const renderTime = perfData.domComplete - perfData.domLoading;

    console.log('[Performance Metrics]', JSON.stringify({
      pageLoadTime,
      connectTime,
      renderTime,
      timestamp: new Date().toISOString()
    }, null, 2));
  } catch (error) {
    console.debug('Failed to log performance metrics:', error);
  }
};

/**
 * Send error to external tracking service (extensible)
 * Currently logs locally; can be extended to send to Datadog, Sentry, etc.
 */
const sendToErrorTracking = async (payload: unknown): Promise<void> => {
  // Check if Datadog RUM is available
  const win = (globalThis as any).window
  if (win && win.DD_RUM) {
    try {
      win.DD_RUM.addError(payload);
    } catch (e) {
      console.debug('Failed to log to Datadog:', e);
    }
  }

  // Check if Sentry is available
  if (win && win.Sentry) {
    try {
      // Create a proper Error object for Sentry
      const error = new Error((payload as any).message || 'Unknown error');
      if ((payload as any).stack) {
        error.stack = (payload as any).stack;
      }
      
      // Capture with context
      win.Sentry.captureException(error, {
        tags: (payload as any).context?.tags || {},
        contexts: {
          error_details: {
            severity: (payload as any).severity,
            environment: (payload as any).environment,
            ...(payload as any).context?.metadata
          }
        },
        extra: (payload as any).context
      });
    } catch (e) {
      console.debug('Failed to log to Sentry:', e);
    }
  }

  // Extend with additional services as needed
};

export default {
  logError,
  logWarning,
  logInfo,
  withErrorLogging,
  logPageView,
  setupGlobalErrorHandling,
  logPerformanceMetrics
};
