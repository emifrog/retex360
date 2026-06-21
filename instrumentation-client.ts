import * as Sentry from '@sentry/nextjs';

// Loaded automatically by Next.js on the client. Replaces the legacy
// sentry.client.config.ts convention (Next 15.3+/Sentry SDK v9+).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.2, // 20% of transactions in production

  // Session Replay (sample rates only — no replayIntegration enabled yet)
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Environment
  environment: process.env.NODE_ENV,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Ignore common non-critical errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
  ],

  // Add user context
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  },
});

// Instruments client-side navigations for performance monitoring.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
