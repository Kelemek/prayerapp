import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for error tracking
 * 
 * Get your DSN from: https://sentry.io/ -> Projects -> Settings -> Client Keys (DSN)
 */
export const initializeSentry = () => {
  // Only initialize in production or when DSN is available
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.log('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: dsn,
    environment: import.meta.env.MODE,
    // Capture 100% of errors
    tracesSampleRate: 0.1, // Only 10% of performance traces to stay within free limits
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'chrome-extension://',
      'moz-extension://',
      // See http://toolbar.google.com/errors/ocsp.html
      'error:addon_install_cancelled',
      // Network errors we don't need to track
      'NetworkError',
      'Failed to fetch',
      // Chrome extensions
      'Permission denied',
    ],
    beforeSend(event) {
      // Filter out events from localhost in development
      if (import.meta.env.MODE === 'development') {
        return null;
      }
      return event;
    },
  });

  console.log('✓ Sentry initialized');
};

export default Sentry;
