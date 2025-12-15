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

// Create rate limiters based on environment
function createRateLimiter(requests: number, window: Duration) {
  // Parse window string for in-memory fallback (e.g., "1 m", "10 s", "1 h")
  const windowStr = String(window);
  const match = windowStr.match(/^(\d+)\s*(s|m|h|d)$/);
  const windowMs = match 
    ? parseInt(match[1]) * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2] as 's'|'m'|'h'|'d']!
    : 60000; // Default 1 minute

  // Use Upstash Redis in production if configured
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      analytics: true,
      prefix: 'retex360_ratelimit',
    });
  }

  // Fallback to in-memory for development
  return createInMemoryRateLimiter(requests, windowMs);
}

// Pre-configured rate limiters for different use cases
export const rateLimiters = {
  // Auth: 5 attempts per minute (strict for login/register)
  auth: createRateLimiter(5, '1 m'),
  
  // Upload: 10 uploads per minute
  upload: createRateLimiter(10, '1 m'),
  
  // API: 60 requests per minute (general API calls)
  api: createRateLimiter(60, '1 m'),
  
  // Search: 30 searches per minute
  search: createRateLimiter(30, '1 m'),
  
  // AI: 10 requests per minute (expensive operations)
  ai: createRateLimiter(10, '1 m'),
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
