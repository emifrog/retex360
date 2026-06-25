import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://retex360.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  // Pages publiques uniquement (le reste est derrière authentification).
  const routes = ['', '/login', '/register', '/about', '/accessibilite'];
  const lastModified = new Date();
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: route === '' ? 1 : 0.6,
  }));
}
