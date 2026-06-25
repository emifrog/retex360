import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://retex360.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Surfaces authentifiées / sensibles non indexables.
        disallow: ['/admin', '/super-admin', '/api', '/settings', '/rex/new'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
