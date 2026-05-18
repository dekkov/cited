import type { MetadataRoute } from 'next';

/**
 * robots.txt via Next.js file convention — served at /robots.txt.
 *
 * - /h/* is allowed (public editorial pages)
 * - App routes, API, admin, onboarding are disallowed for crawlers
 * - Sitemap URL is provided
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/h/',
      disallow: ['/(app)/', '/api/', '/(admin)/', '/(onboarding)/', '/dashboard'],
    },
    sitemap: `${process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000'}/sitemap.xml`,
  };
}
