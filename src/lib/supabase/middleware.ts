import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Security headers applied to all responses
const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Politique de sécurité de contenu.
 *
 * `script-src 'unsafe-eval'` n'est nécessaire qu'en développement, où React
 * Refresh compile et évalue du code à la volée. Il n'est plus émis en
 * production.
 *
 * `script-src 'unsafe-inline'` en revanche EST CONSERVÉ, à contre-cœur, et il
 * faut savoir pourquoi avant d'essayer de le retirer :
 *
 *   Le remplacer par un nonce par requête est le geste classique, et il a été
 *   tenté ici. Il casse l'application. Next prérend statiquement les pages qui
 *   ne lisent aucune donnée de requête — ici `/login`, `/register`,
 *   `/forgot-password`, `/reset-password`, plus `_not-found` et
 *   `_global-error`. Leur HTML est figé au build, donc SANS nonce, alors que
 *   l'en-tête en porte un nouveau à chaque requête. Les quatre scripts inline
 *   que Next y place — bascule de thème, polyfill de soumission de formulaire
 *   et les deux blocs de données d'hydratation — seraient refusés, et ces
 *   pages ne s'hydrateraient plus du tout. Constaté sur le HTML prérendu, pas
 *   supposé : `.next/server/app/login.html` contient bien 4 `<script>` inline
 *   et 0 attribut `nonce`.
 *
 *   Pour y arriver il faudrait d'abord rendre ces pages dynamiques (et
 *   `_not-found` / `_global-error` ne s'y prêtent pas simplement), puis
 *   vérifier sur un serveur réel que Next appose bien le nonce. C'est un
 *   chantier à mener avec l'application qui tourne, pas une ligne de config.
 *
 * `style-src 'unsafe-inline'` est conservé également : Radix positionne ses
 * surfaces flottantes par style inline et Tailwind injecte ses variables de
 * thème de la même manière. Le risque porté par un style injecté est sans
 * commune mesure avec celui d'un script.
 */
function buildCsp(): string {
  return [
    "default-src 'self'",
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io https://*.sentry-cdn.com"
      : "script-src 'self' 'unsafe-inline' https://*.sentry.io https://*.sentry-cdn.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.sentry.io https://*.upstash.io https://openrouter.ai",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

function applySecurityHeaders(response: NextResponse, csp: string): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export async function updateSession(request: NextRequest) {
  const csp = buildCsp();

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Auth routes (pages de connexion/inscription)
  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password');

  // Toutes les routes sauf auth, api et _next sont protégées
  const isProtectedRoute =
    !isAuthRoute &&
    !request.nextUrl.pathname.startsWith('/api') &&
    !request.nextUrl.pathname.startsWith('/_next');

  // Rediriger vers /login si non connecté et route protégée
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const redirectResponse = NextResponse.redirect(url);
    return applySecurityHeaders(redirectResponse, csp);
  }

  // Rediriger vers / si connecté et sur une page auth
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    const redirectResponse = NextResponse.redirect(url);
    return applySecurityHeaders(redirectResponse, csp);
  }

  return applySecurityHeaders(supabaseResponse, csp);
}
