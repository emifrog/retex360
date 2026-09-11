import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from '@/lib/sentry-scrub';

// Loaded automatically by Next.js on the client. Replaces the legacy
// sentry.client.config.ts convention (Next 15.3+/Sentry SDK v9+).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.2, // 20% of transactions in production

  // Pas de Session Replay : `replayIntegration` n'est pas chargée, et les taux
  // d'échantillonnage qui figuraient ici ne faisaient donc rien. Les activer
  // filmerait des écrans de REX — contenus d'intervention réels — ce qui
  // demanderait au minimum le masquage de tout le texte saisi.
  environment: process.env.NODE_ENV,

  sendDefaultPii: false,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Ignore common non-critical errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
  ],

  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    // Même filtrage que côté serveur : une erreur déclenchée pendant la saisie
    // d'un REX ne doit pas emporter le brouillon ni le cookie de session.
    return scrubEvent(event);
  },
});

// Instruments client-side navigations for performance monitoring.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
