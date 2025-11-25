import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://05671b4136141cae9628dbfe9227d11f@o4510308585046016.ingest.de.sentry.io/4510427321139280",

  // Performance Monitoring pour Edge Runtime (middleware)
  tracesSampleRate: 1.0, // Réduire à 0.1-0.2 en production

  // Environnement
  environment: process.env.NODE_ENV,

  // Debug en développement uniquement
  debug: process.env.NODE_ENV === "development",
});
