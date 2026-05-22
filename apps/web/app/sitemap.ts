import { getAnonSupabase } from '@/lib/supabase/anon';
import { templateShouldNoIndex } from '@cited/core';
import type { MetadataRoute } from 'next';

/**
 * Dynamic sitemap — lists all published habit_template pages excluding those
 * that are no-indexed due to supplement/medical_advice/contraindication risk flags (PUB-04).
 *
 * Served automatically at /sitemap.xml via Next.js file convention.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supa = getAnonSupabase();

  const { data } = await supa.from('habit_templates').select(`
    slug,
    updated_at,
    habit_template_clips!inner(
      clip:clips!inner(
        risk_flags
      )
    )
  `);

  const base = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';

  return (data ?? [])
    .filter((row) => {
      // biome-ignore lint/suspicious/noExplicitAny: PostgREST nested type not inferred
      const clipRiskFlags = (row.habit_template_clips as any[]).map((x) => ({
        risk_flags: x.clip?.risk_flags ?? [],
      }));
      return !templateShouldNoIndex(clipRiskFlags);
    })
    .map((row) => ({
      url: `${base}/h/${row.slug}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));
}
