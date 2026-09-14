import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimiters, limitByIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { RECOVERY_COOKIE, RECOVERY_COOKIE_MAX_AGE } from '@/lib/auth/recovery';

/**
 * Point d'atterrissage des liens envoyés par courriel (récupération de mot de
 * passe aujourd'hui, autres parcours par courriel ensuite).
 *
 * Ce maillon manquait. `resetPasswordForEmail` renvoyait directement sur
 * `/reset-password`, une page qui ne traitait le code NULLE PART : ni
 * `exchangeCodeForSession`, ni `verifyOtp`. Aucune session de récupération
 * n'était donc établie par le lien, et la page se contentait de considérer tout
 * lien valide (`|| true`) avant d'appeler une API qui, elle, exigeait une
 * session — d'où un parcours qui ne pouvait aboutir que par hasard, quand une
 * session ordinaire traînait déjà dans le navigateur.
 *
 * Deux formats de lien sont acceptés, parce que Supabase émet l'un ou l'autre
 * selon la version du gabarit de courriel configuré :
 *   * `?code=...`            — flux PKCE, échangé contre une session ;
 *   * `?token_hash=&type=`   — lien OTP, vérifié par `verifyOtp`.
 *
 * En cas de succès, un cookie de courte durée marque la session comme issue
 * d'une récupération. C'est lui qui autorise l'accès à `/reset-password` et qui
 * est exigé par `POST /api/auth/reset-password` : sans cette marque, une session
 * ordinaire suffirait à changer le mot de passe sans connaître l'ancien.
 */
export async function GET(request: NextRequest) {
  const limited = await limitByIp(rateLimiters.auth, request);
  if (limited) return limited;

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  // `next` vient de l'URL : il ne peut désigner qu'un chemin interne, jamais un
  // hôte tiers — sinon le lien de récupération devient une redirection ouverte.
  const requestedNext = searchParams.get('next') || '/reset-password';
  const next =
    requestedNext.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : '/reset-password';

  const failure = () =>
    NextResponse.redirect(new URL('/reset-password?error=lien_invalide', origin));

  // Supabase peut rediriger avec son propre motif d'échec (lien expiré, déjà
  // consommé) sans code exploitable.
  if (searchParams.get('error') || (!code && !tokenHash)) {
    return failure();
  }

  try {
    const supabase = await createClient();

    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token_hash: tokenHash!,
          type: type === 'invite' || type === 'signup' ? type : 'recovery',
        });

    if (error) {
      // Attendu et sans gravité : lien expiré, déjà utilisé, ou ouvert dans un
      // autre navigateur que celui qui a fait la demande (le vérificateur PKCE
      // y est absent). L'utilisateur est renvoyé vers une demande de nouveau
      // lien, pas vers une page d'erreur technique.
      logger.warn('Auth callback rejected', { reason: error.message });
      return failure();
    }

    const response = NextResponse.redirect(new URL(next, origin));
    response.cookies.set(RECOVERY_COOKIE, '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: RECOVERY_COOKIE_MAX_AGE,
    });
    return response;
  } catch (error) {
    logger.error('Auth callback error:', error);
    return failure();
  }
}
