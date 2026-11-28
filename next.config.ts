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
  experimental: {
    // Pas de cache disque Turbopack pour `next build` (actif par défaut depuis
    // Next 16.3, dans `.next/cache/turbopack`, que l'hébergeur restaure d'un
    // déploiement à l'autre).
    //
    // Le 28 novembre 2026, il a fait servir en production une feuille de styles
    // compilée depuis une ancienne version de `globals.css` : classes
    // utilitaires à jour, mais ni les jetons ajoutés ni les règles du texte
    // riche. Compilation réussie, CI verte, rien à l'écran pour le signaler.
    // Constaté deux fois sur quatre compilations avec cache, jamais sans.
    //
    // Coût : quelques secondes de compilation. `scripts/check-built-css.cjs`
    // (script `postbuild`) vérifie de son côté que la feuille produite reflète
    // bien `globals.css`. Le cache de `next dev` n'est pas concerné.
    turbopackFileSystemCacheForBuild: false,
  },
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
