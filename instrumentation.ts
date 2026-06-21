import * as Sentry from '@sentry/nextjs';

// Loaded automatically by Next.js on the server/edge runtimes.
// This is the canonical entry point for Sentry server/edge init since
// Next 13.4+/Sentry SDK v8+ — without it, sentry.server/edge.config are
// never executed and no server-side errors are captured.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Captures errors thrown in React Server Components, route handlers, etc.
export const onRequestError = Sentry.captureRequestError;
