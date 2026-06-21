import { Ratelimit, type Duration } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// In-memory fallback for development (no Redis required)
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Simple in-memory rate limiter for development
function createInMemoryRateLimiter(requests: number, windowMs: number) {
  return {
    async limit(identifier: string): Promise<RateLimitResult> {
      const now = Date.now();
      const key = identifier;
      const record = inMemoryStore.get(key);

      if (!record || now > record.resetTime) {
        inMemoryStore.set(key, { count: 1, resetTime: now + windowMs });
        return { success: true, limit: requests, remaining: requests - 1, reset: now + windowMs };
      }

      if (record.count >= requests) {
        return { success: false, limit: requests, remaining: 0, reset: record.resetTime };
      }

      record.count++;
      return { success: true, limit: requests, remaining: requests - record.count, reset: record.resetTime };
    },
  };
}

const isProduction = process.env.NODE_ENV === 'production';
// `next build` runs with NODE_ENV=production but without runtime secrets — don't
// fail the build, only fail fast on a real production server.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

// Fail fast in a running production server if no distributed store is
// configured. The in-memory fallback is per-instance and therefore useless in
// serverless (Vercel) — relying on it is a silent fail-open of every limiter.
if (isProduction && !isBuildPhase && !hasUpstash) {
  throw new Error(
    'Rate limiting misconfigured: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN ' +
      'are required in production. The in-memory fallback is per-instance and does not ' +
      'protect serverless deployments.'
  );
}

// Create rate limiters based on environment.
// `failClosed`: when Redis is unreachable at request time, deny the request
// instead of degrading to the (serverless-ineffective) in-memory store. Use for
// sensitive limiters such as auth brute-force and costly AI calls.
function createRateLimiter(
  requests: number,
  window: Duration,
  { failClosed = false }: { failClosed?: boolean } = {}
) {
  // Parse window string for in-memory fallback (e.g., "1 m", "10 s", "1 h")
  const windowStr = String(window);
  const match = windowStr.match(/^(\d+)\s*(s|m|h|d)$/);
  const windowMs = match
    ? parseInt(match[1]) * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2] as 's'|'m'|'h'|'d']!
    : 60000; // Default 1 minute

  // Use Upstash Redis when configured (required in production, see boot guard).
  if (hasUpstash) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const upstashLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      analytics: true,
      prefix: 'retex360_ratelimit',
    });

    // Wrap with fallback in case Redis is unreachable
    const fallback = createInMemoryRateLimiter(requests, windowMs);
    return {
      async limit(identifier: string): Promise<RateLimitResult> {
        try {
          return await upstashLimiter.limit(identifier);
        } catch {
          if (failClosed) {
            // Deny rather than degrade to an ineffective per-instance store.
            return { success: false, limit: requests, remaining: 0, reset: Date.now() + windowMs };
          }
          return fallback.limit(identifier);
        }
      },
    };
  }

  // Development only: in-memory fallback (production is guarded above).
  return createInMemoryRateLimiter(requests, windowMs);
}

// Pre-configured rate limiters for different use cases
export const rateLimiters = {
  // Auth: 5 attempts per minute (strict for login/register) — fail-closed to
  // keep brute-force protection effective even during a Redis outage.
  auth: createRateLimiter(5, '1 m', { failClosed: true }),

  // Upload: 10 uploads per minute
  upload: createRateLimiter(10, '1 m'),

  // API: 60 requests per minute (general API calls)
  api: createRateLimiter(60, '1 m'),

  // Search: 30 searches per minute
  search: createRateLimiter(30, '1 m'),

  // AI: 10 requests per minute (expensive operations) — fail-closed to bound
  // cost even during a Redis outage.
  ai: createRateLimiter(10, '1 m', { failClosed: true }),
};

// Helper to get client IP from request
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

// Helper to create rate limit response
export function rateLimitResponse(reset: number) {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  
  return new Response(
    JSON.stringify({
      error: 'Trop de requêtes. Veuillez réessayer plus tard.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(reset),
      },
    }
  );
}

// Middleware helper for API routes
export async function checkRateLimit(
  request: Request,
  limiter: typeof rateLimiters.auth,
  identifier?: string
): Promise<RateLimitResult | Response> {
  const ip = identifier || getClientIp(request);
  const result = await limiter.limit(ip);

  if (!result.success) {
    return rateLimitResponse(result.reset);
  }

  return result;
}
