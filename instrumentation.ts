import * as Sentry from '@sentry/nextjs';

// Loaded automatically by Next.js on the server/edge runtimes.
// This is the canonical entry point for Sentry server/edge init since
// Next 13.4+/Sentry SDK v8+ — without it, sentry.server/edge.config are
// never executed and no server-side errors are captured.
// Échoue vite et clairement si une variable critique manque (sinon le site
// renvoie des 500 opaques partout). Ignoré pendant le build (secrets absents).
function assertRequiredEnv() {
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Configuration invalide : variable(s) d'environnement manquante(s) — ${missing.join(', ')}. ` +
        'Définissez-les avant de démarrer le serveur.'
    );
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    assertRequiredEnv();
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Captures errors thrown in React Server Components, route handlers, etc.
export const onRequestError = Sentry.captureRequestError;
