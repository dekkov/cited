import { ImageResponse } from 'next/og';
import { getAnonSupabase } from '@/lib/supabase/anon';

// Next.js file convention: auto-injected into <head> as og:image meta tag.
// Auto-cached at the edge, sized correctly, no custom /api/og route needed.
// (PUB-03, replaces D-12's /api/og/h/[slug] route-handler approach per CONTEXT.md amendment)

export const alt = 'Habit backed by Diary of a CEO';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // ANON client only — no service role, no session (PUB-05)
  const supa = getAnonSupabase();
  const { data: tpl } = await supa
    .from('habit_templates')
    .select(
      `
      title,
      habit_template_clips!inner(
        clip:clips!inner(
          speaker,
          youtube_video_id
        )
      )
    `,
    )
    .eq('slug', slug)
    .single();

  // biome-ignore lint/suspicious/noExplicitAny: PostgREST nested type not inferred
  const firstClipData = (tpl?.habit_template_clips as any[])?.[0]?.clip as
    | { speaker: string; youtube_video_id: string }
    | undefined;

  const title = tpl?.title ?? 'Cited';
  const speaker = firstClipData?.speaker ?? '';
  const youtubeId = firstClipData?.youtube_video_id ?? '';

  // YouTube maxresdefault thumbnail (fetched at OG image generation time)
  const thumbnailUrl = youtubeId
    ? `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`
    : '';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#F4EFE6', // warm paper palette
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {/* YouTube thumbnail left half */}
        {thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            width={540}
            height={304}
            style={{
              objectFit: 'cover',
              alignSelf: 'center',
              marginLeft: 24,
              borderRadius: 12,
            }}
            alt=""
          />
        )}

        {/* Text right half */}
        <div
          style={{
            padding: '0 48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          {/* Cited wordmark */}
          <div
            style={{
              fontSize: 18,
              color: '#8B8B99',
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Cited
          </div>

          {/* Habit title */}
          <div
            style={{
              fontSize: 48,
              color: '#15161A',
              lineHeight: 1.15,
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            {title}
          </div>

          {/* Speaker */}
          {speaker && (
            <div
              style={{
                fontSize: 22,
                color: '#5C5D66',
              }}
            >
              {speaker}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
