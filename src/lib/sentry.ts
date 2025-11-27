import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for error tracking
 * 
 * Get your DSN from: https://sentry.io/ -> Projects -> Settings -> Client Keys (DSN)
 */
export const initializeSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  console.log('🔍 Sentry initialization check:');
  console.log('DSN value:', dsn);
  console.log('Environment:', import.meta.env.MODE);

  if (!dsn) {
    console.warn('⚠️ Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  try {
    Sentry.init({
      dsn: dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',
      ignoreErrors: [
        'top.GLOBALS',
        'chrome-extension://',
        'moz-extension://',
        'error:addon_install_cancelled',
        'NetworkError',
        'Failed to fetch',
        'Permission denied',
      ],
      beforeSend(event) {
        if (import.meta.env.MODE === 'development') {
          console.log('🚫 Filtering out development error');
          return null;
        }
        return event;
      },
    });

    console.log('✅ Sentry initialized successfully');
    console.log('Sentry object:', Sentry);
    
    // Expose Sentry globally for manual testing
    (window as any).Sentry = Sentry;
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error);
  }
};
