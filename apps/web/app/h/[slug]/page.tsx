import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { templateShouldNoIndex } from '@cited/core';
import { getAnonSupabase } from '@/lib/supabase/anon';
import { HabitEditorial } from './_components/HabitEditorial';

// PUB-05: Uses ONLY anon Supabase client. No admin client imports here.
// RLS must deny anon role reads to user-scoped tables (verified by rls-public-habit.spec.ts).

type Clip = {
  id: string;
  claim: string;
  rationale: string | null;
  speaker: string;
  speaker_status: string;
  risk_flags: string[];
  start_seconds: number;
  end_seconds: number;
  youtube_video_id: string;
  episode: {
    title: string | null;
    published_at: string | null;
  } | null;
};

type PublicHabitTemplate = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  domain: string;
  trigger: string | null;
  tiny_action: string | null;
  citedClips: Clip[];
  firstClaim: string;
};

async function loadPublicHabit(slug: string): Promise<PublicHabitTemplate | null> {
  // ANON client only — RLS enforces access control at the DB level.
  const supa = getAnonSupabase();

  const { data: tpl } = await supa
    .from('habit_templates')
    .select(`
      id,
      slug,
      title,
      description,
      domain,
      trigger,
      tiny_action,
      habit_template_clips!inner(
        clip:clips!inner(
          id,
          claim,
          rationale,
          speaker,
          speaker_status,
          risk_flags,
          start_seconds,
          end_seconds,
          youtube_video_id,
          episode:episodes!inner(
            title,
            published_at
          )
        )
      )
    `)
    .eq('slug', slug)
    .single();

  if (!tpl) return null;

  // biome-ignore lint/suspicious/noExplicitAny: PostgREST nested type is not inferred
  const citedClips = (tpl.habit_template_clips as any[]).map((x) => x.clip as Clip);

  return {
    id: tpl.id,
    slug: tpl.slug,
    title: tpl.title,
    description: tpl.description ?? null,
    domain: tpl.domain,
    trigger: tpl.trigger ?? null,
    tiny_action: tpl.tiny_action ?? null,
    citedClips,
    firstClaim: citedClips[0]?.claim ?? '',
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tpl = await loadPublicHabit(slug);
  if (!tpl) return {};

  const noindex = templateShouldNoIndex(
    tpl.citedClips.map((c) => ({ risk_flags: c.risk_flags })),
  );

  const firstClip = tpl.citedClips[0];
  const youtubeId = firstClip?.youtube_video_id ?? '';
  const startSec = firstClip?.start_seconds ?? 0;

  return {
    title: `${tpl.title} — Cited`,
    description: tpl.firstClaim.slice(0, 160),
    robots: noindex ? { index: false, follow: true } : undefined,
    // Pitfall 18: canonical points to YouTube URL with start timestamp (not our page URL)
    alternates: { canonical: youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}&t=${startSec}s` : undefined },
    openGraph: {
      title: `${tpl.title} — Cited`,
      description: tpl.firstClaim.slice(0, 160),
      type: 'article',
    },
  };
}

export default async function PublicHabitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tpl = await loadPublicHabit(slug);
  if (!tpl) notFound();

  return <HabitEditorial template={tpl} />;
}
