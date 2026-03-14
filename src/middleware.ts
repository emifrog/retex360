import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Simple in-memory rate limiter for middleware (global API protection)
const apiHits = new Map<string, { count: number; resetTime: number }>();

function getIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

// Global rate limit: 120 requests/min per IP for API routes
function checkGlobalRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 120;

  const record = apiHits.get(ip);

  if (!record || now > record.resetTime) {
    apiHits.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }

  record.count++;
  return { allowed: true, retryAfter: 0 };
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of apiHits) {
    if (now > value.resetTime) apiHits.delete(key);
  }
}, 300_000);

export async function middleware(request: NextRequest) {
  // Apply global rate limit to API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = getIp(request);
    const { allowed, retryAfter } = checkGlobalRateLimit(ip);

    if (!allowed) {
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
