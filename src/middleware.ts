import { NextResponse, type NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Garde-fou anti-flood, par IP, appliqué avant tout travail.
 *
 * Ce limiteur n'est PAS un quota métier : les quotas par utilisateur sont
 * appliqués dans les routes, après authentification (`limitByUser`). Ici on ne
 * cherche qu'à couper un flood brut avant qu'il ne coûte un appel réseau.
 *
 * Le plafond doit donc être calibré sur le trafic légitime d'une IP ENTIÈRE,
 * pas d'un utilisateur : un SDIS de plusieurs dizaines d'agents derrière un
 * même NAT génère facilement plusieurs centaines de requêtes par minute en
 * usage normal. Ajustable sans redéploiement de code via
 * `GLOBAL_RATE_LIMIT_PER_MINUTE` si un client dépasse le défaut.
 */
const GLOBAL_LIMIT_PER_MINUTE = Number(process.env.GLOBAL_RATE_LIMIT_PER_MINUTE) || 1000;

let globalRateLimiter: Ratelimit | null = null;

function getGlobalRateLimiter(): Ratelimit | null {
  if (globalRateLimiter) return globalRateLimiter;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    globalRateLimiter = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(GLOBAL_LIMIT_PER_MINUTE, '1 m'),
      analytics: true,
      prefix: 'retex360_global',
    });
  }

  return globalRateLimiter;
}

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
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
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
