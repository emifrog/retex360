import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";

function hostnameOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// Autorise l'hôte Scaleway Object Storage pour next/image lorsqu'il est configuré
// (les pièces jointes y sont servies via URLs signées). Sans config Scaleway,
// rien n'est ajouté et le stockage reste sur Supabase.
const scalewayHost = hostnameOf(process.env.SCALEWAY_S3_ENDPOINT);

// Hôte Supabase du projet COURANT, dérivé de l'URL déjà configurée.
//
// Un motif générique `*.supabase.co` n'autoriserait pas « notre projet Supabase »
// mais TOUS les projets Supabase existants : n'importe qui peut en ouvrir un
// gratuitement, y déposer un fichier, et le faire récupérer puis décoder par
// notre serveur via `/_next/image?url=…`. C'est à la fois un proxy d'images
// ouvert à nos frais et le moyen de placer un fichier choisi devant le
// décodeur d'images.
//
// Dérivé de l'env plutôt qu'écrit en dur : chaque environnement (prod, staging,
// local) épingle ainsi son propre projet sans valeur à maintenir ici.
const supabaseHost = hostnameOf(process.env.NEXT_PUBLIC_SUPABASE_URL);

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
      ...(supabaseHost ? [{ protocol: 'https' as const, hostname: supabaseHost }] : []),
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
