import type { MetadataRoute } from 'next';
import { listEpisodes } from '@/lib/content';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const episodes = await listEpisodes();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/landing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/lessons`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  const lessonRoutes: MetadataRoute.Sitemap = episodes
    .filter(ep => /^ep\d+$/i.test(ep.id))
    .flatMap(ep => [
      {
        url: `${siteUrl}/study/${ep.id}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      },
      {
        url: `${siteUrl}/play/${ep.id}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      },
    ]);

  return [...staticRoutes, ...lessonRoutes];
}
