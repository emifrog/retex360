import type { ErrorEvent } from '@sentry/nextjs';

/**
 * Nettoyage des rapports d'erreur avant envoi au collecteur.
 *
 * Un REX décrit une intervention réelle : lieux, moyens engagés, parfois bilan
 * humain. Ces contenus transitent en clair dans les corps de requête et les
 * paramètres de recherche. Sans filtrage, une erreur survenue sur un POST
 * `/api/rex` expédie le REX entier — et le cookie de session avec — vers un
 * service tiers, hors du périmètre d'hébergement choisi pour la plateforme.
 *
 * On garde donc ce qui sert au diagnostic (chemin, méthode, statut, pile
 * d'appel) et on retire ce qui porte de la donnée métier ou des identifiants.
 * Le chemin est conservé tel quel : il ne contient que des UUID, jamais de
 * contenu.
 */

/** En-têtes conservés : tout le reste est écarté par défaut. */
const HEADER_ALLOWLIST = new Set([
  'content-type',
  'content-length',
  'user-agent',
  'accept-language',
  'referer',
]);

const REDACTED = '[retiré]';

export function scrubEvent<T extends ErrorEvent>(event: T): T {
  const request = event.request;
  if (request) {
    // Corps de requête : c'est là que se trouve le REX rédigé.
    if (request.data !== undefined) request.data = REDACTED;

    // Paramètres d'URL : termes de recherche saisis par l'utilisateur.
    if (request.query_string !== undefined) request.query_string = REDACTED;

    // Cookies : le jeton de session Supabase y est. Un rapport d'erreur ne doit
    // jamais permettre de rejouer la session de celui qui l'a déclenché.
    delete request.cookies;

    if (request.headers) {
      request.headers = Object.fromEntries(
        Object.entries(request.headers).filter(([name]) => HEADER_ALLOWLIST.has(name.toLowerCase()))
      );
    }
  }

  // Le SDK peut joindre l'IP même avec `sendDefaultPii: false` selon la source
  // de l'événement ; on ne garde que l'identifiant technique du compte, utile
  // pour corréler sans rien révéler.
  if (event.user) {
    event.user = event.user.id ? { id: event.user.id } : {};
  }

  return event;
}
