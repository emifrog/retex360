import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://05671b4136141cae9628dbfe9227d11f@o4510308585046016.ingest.de.sentry.io/4510427321139280",

  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% des transactions en dev, réduire à 0.1-0.2 en production

  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% des sessions
  replaysOnErrorSampleRate: 1.0, // 100% des sessions avec erreurs

  // Intégrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
    Sentry.feedbackIntegration({
      colorScheme: "system",
      buttonLabel: "Signaler un bug",
      submitButtonLabel: "Envoyer",
      cancelButtonLabel: "Annuler",
      formTitle: "Signaler un problème",
      nameLabel: "Nom",
      namePlaceholder: "Votre nom",
      emailLabel: "Email",
      emailPlaceholder: "votre.email@sdis.fr",
      messageLabel: "Description du problème",
      messagePlaceholder: "Décrivez le problème rencontré...",
      successMessageText: "Merci pour votre retour !",
    }),
  ],

  // Environnement
  environment: process.env.NODE_ENV,

  // Filtrer les erreurs non pertinentes
  beforeSend(event, hint) {
    // Ignorer les erreurs de réseau communes
    const error = hint.originalException as Error;
    if (error?.message?.includes("Failed to fetch")) {
      return null;
    }
    if (error?.message?.includes("Load failed")) {
      return null;
    }
    if (error?.message?.includes("NetworkError")) {
      return null;
    }
    return event;
  },

  // Debug en développement uniquement
  debug: process.env.NODE_ENV === "development",
});
