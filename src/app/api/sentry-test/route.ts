import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function GET() {
  const hasDsn = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
  const env = process.env.NODE_ENV;
  
  try {
    // This will throw an error and be captured by Sentry
    throw new Error('Test Sentry Error - API Route');
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ 
      error: 'Test error sent to Sentry',
      debug: {
        hasDsn,
        env,
        sentryEnabled: env === 'production' && hasDsn,
      }
    }, { status: 500 });
  }
}
