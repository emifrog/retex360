import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";

// Autorise l'hôte Scaleway Object Storage pour next/image lorsqu'il est configuré
// (les pièces jointes y sont servies via URLs signées). Sans config Scaleway,
// rien n'est ajouté et le stockage reste sur Supabase.
const scalewayHost = process.env.SCALEWAY_S3_ENDPOINT
  ? (() => {
      try {
        return new URL(process.env.SCALEWAY_S3_ENDPOINT as string).hostname;
      } catch {
        return null;
      }
    })()
  : null;

const nextConfig: NextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
      ...(scalewayHost ? [{ protocol: 'https' as const, hostname: scalewayHost }] : []),
    ],
  },
};

const analyzedConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);

export default withSentryConfig(analyzedConfig, {
  // Sentry options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress logs during build
  silent: !process.env.CI,

  // Upload source maps for better stack traces
  widenClientFileUpload: true,

  // Source maps configuration
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Automatically tree-shake Sentry logger
  disableLogger: true,

  // Enable React component annotations
  reactComponentAnnotation: {
    enabled: true,
  },
});
