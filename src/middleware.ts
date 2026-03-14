import { NextResponse, type NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { updateSession } from '@/lib/supabase/middleware';

// Global rate limiter using Upstash Redis (persists across serverless invocations)
let globalRateLimiter: Ratelimit | null = null;

function getGlobalRateLimiter(): Ratelimit | null {
  if (globalRateLimiter) return globalRateLimiter;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    globalRateLimiter = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(120, '1 m'),
      analytics: true,
      prefix: 'retex360_global',
    });
  }

  return globalRateLimiter;
}

function getIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function middleware(request: NextRequest) {
  // Apply global rate limit to API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const limiter = getGlobalRateLimiter();
    if (limiter) {
      try {
        const ip = getIp(request);
        const { success, reset } = await limiter.limit(ip);

        if (!success) {
          const retryAfter = Math.ceil((reset - Date.now()) / 1000);
          return NextResponse.json(
            { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
            {
              status: 429,
              headers: {
                'Retry-After': String(retryAfter),
              },
            }
          );
        }
      } catch {
        // If Redis is unreachable, allow the request through
        // Per-route rate limiters will still catch abuse
      }
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
