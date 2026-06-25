import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RETEX360 — Plateforme RETEX collaborative',
    short_name: 'RETEX360',
    description:
      "Plateforme collaborative de retours d'expérience (RETEX) pour les services d'incendie et de secours (SDIS).",
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#b91c1c',
    lang: 'fr',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
