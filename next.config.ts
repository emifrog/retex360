import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "localhost" },
      { protocol: "https", hostname: "uploadthing.com" },
      { protocol: "https", hostname: "utfs.io" },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Options de l'organisation Sentry
  org: "retex360",
  project: "javascript-nextjs",

  // Supprime les messages de logs du SDK Sentry pendant le build
  silent: !process.env.CI,

  // Upload des source maps pour de meilleurs stack traces
  widenClientFileUpload: true,

  // Active la télémétrie Sentry (aide à améliorer le SDK)
  telemetry: false,

  // Configuration des source maps
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
