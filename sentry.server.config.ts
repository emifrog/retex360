import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: 0.2, // 20% of transactions in production
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Set sampling rate for profiling
  profilesSampleRate: 0.1, // 10% of profiled transactions
});
