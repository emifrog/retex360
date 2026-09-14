import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { RECOVERY_COOKIE } from '@/lib/auth/recovery';

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
    // Pas d'hôte de fournisseur LLM ici : les appels au modèle partent des
    // routes API, côté serveur, où `connect-src` — qui ne régit que le
    // navigateur — n'a aucune prise. L'entrée `openrouter.ai` qui figurait ici
    // n'autorisait donc rien d'utile.
    //
    // `wss:` est indispensable et ne découle PAS de `https:`. La CSP traite les
    // schémas séparément : une source `https://*.supabase.co` n'autorise pas
    // `wss://*.supabase.co`. Le temps réel de Supabase passant par WebSocket,
    // le navigateur refusait la connexion à chaque chargement de page — et
    // `use-notifications` ne recevait jamais rien. Comme ce hook n'a aucun repli
    // par interrogation périodique, la pastille de notifications ne bougeait
    // qu'au rechargement complet, sans qu'aucune erreur ne remonte à l'écran.
    "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://*.sentry.io https://*.upstash.io",
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

  // `/reset-password` est le seul parcours où être authentifié est NORMAL :
  // `/api/auth/callback` vient d'ouvrir une session à partir du lien reçu par
  // courriel, et c'est justement cette session qui autorise le changement.
  // La règle « connecté sur une page auth => retour à l'accueil » renvoyait donc
  // l'utilisateur à l'accueil au moment précis où il arrivait pour agir.
  //
  // Le cookie de récupération fait la différence : sans lui, la règle générale
  // s'applique et une session ordinaire ne donne pas accès à la page.
  const isRecoveryLanding =
    request.nextUrl.pathname.startsWith('/reset-password') && request.cookies.has(RECOVERY_COOKIE);

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
  if (user && isAuthRoute && !isRecoveryLanding) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    const redirectResponse = NextResponse.redirect(url);
    return applySecurityHeaders(redirectResponse, csp);
  }

  return applySecurityHeaders(supabaseResponse, csp);
}
