import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of transactions (reduce in production)
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Set sampling rate for profiling
  profilesSampleRate: 1.0,
});
