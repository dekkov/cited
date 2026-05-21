import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { YouTubeEmbed } from '@next/third-parties/google';
import Link from 'next/link';
import { AdoptButton, type AdoptionState } from './AdoptButton';

type EpisodeData = {
  title: string | null;
  published_at: string | null;
};

type ClipData = {
  id: string;
  claim: string;
  rationale: string | null;
  speaker: string;
  speaker_status: string;
  risk_flags: string[];
  start_seconds: number;
  end_seconds: number;
  youtube_video_id: string;
  episode: EpisodeData | null;
};

type TemplateData = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  domain: string;
  trigger: string | null;
  tiny_action: string | null;
  citedClips: ClipData[];
  firstClaim: string;
};

interface HabitEditorialProps {
  template: TemplateData;
  adoptionState: AdoptionState;
}

const DOMAIN_LABELS: Record<string, string> = {
  sleep: 'Sleep',
  nutrition_gut: 'Nutrition & Gut',
  exercise_longevity: 'Exercise & Longevity',
  mental_health: 'Mental Health',
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function SpeakerStatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    verified: 'Verified Expert',
    host: 'Host',
    unverified: 'Guest',
  };
  return (
    <span className="inline-block rounded-full border border-[var(--color-rule)] px-2 py-0.5 text-xs text-[var(--color-ink-3)]">
      {labels[status] ?? status}
    </span>
  );
}

export function HabitEditorial({ template, adoptionState }: HabitEditorialProps) {
  const firstClip = template.citedClips[0];

  const youtubeUrl = firstClip
    ? `https://www.youtube.com/watch?v=${firstClip.youtube_video_id}&t=${firstClip.start_seconds}s`
    : null;

  // JSON-LD structured data (schema.org HowTo)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: template.title,
    description: template.firstClaim,
    step: [
      template.trigger && {
        '@type': 'HowToStep',
        name: 'Trigger',
        text: template.trigger,
      },
      template.tiny_action && {
        '@type': 'HowToStep',
        name: 'Action',
        text: template.tiny_action,
      },
    ].filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled JSON-LD schema data
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-2xl">
        {/* Domain badge */}
        <div className="mb-4">
          <span className="rounded-full border border-[var(--color-rule)] px-3 py-1 text-xs uppercase tracking-wider text-[var(--color-ink-3)]">
            {DOMAIN_LABELS[template.domain] ?? template.domain}
          </span>
        </div>

        {/* Title */}
        <h1 className="mb-6 text-4xl font-[family-name:var(--font-newsreader)] leading-tight text-[var(--color-ink)]">
          {template.title}
        </h1>

        {/* Block-quoted claim — Newsreader italic with sage opening quote glyph */}
        {firstClip && (
          <blockquote className="relative mb-6 border-l-4 border-[var(--color-accent)] py-1 pl-6">
            <span
              className="absolute left-0 top-0 font-[family-name:var(--font-newsreader)] text-5xl leading-none text-[var(--color-accent)] opacity-50"
              aria-hidden="true"
            >
              &ldquo;
            </span>
            <p className="font-[family-name:var(--font-newsreader)] text-xl italic leading-relaxed text-[var(--color-ink)]">
              {firstClip.claim}
            </p>
          </blockquote>
        )}

        {/* Speaker name + credentials + attribution note */}
        {firstClip && (
          <div className="mb-6 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--color-ink)]">{firstClip.speaker}</span>
              <SpeakerStatusBadge status={firstClip.speaker_status} />
            </div>
            <p className="text-xs text-[var(--color-ink-3)]">
              Cited speaker; never implies endorsement of this app.
            </p>
            {firstClip.episode && (
              <p className="text-sm text-[var(--color-ink-3)]">
                {firstClip.episode.title && (
                  <span className="italic">{firstClip.episode.title}</span>
                )}
                {firstClip.episode.title && firstClip.episode.published_at && ' · '}
                {firstClip.episode.published_at && (
                  <time dateTime={firstClip.episode.published_at}>
                    {formatDate(firstClip.episode.published_at)}
                  </time>
                )}
              </p>
            )}
          </div>
        )}

        {/* YouTubeEmbed — hero mode, never controls=0 (HAB-05). start+end required. */}
        {firstClip && (
          <div className="mb-6 overflow-hidden rounded-lg" style={{ height: '200px' }}>
            <YouTubeEmbed
              videoid={firstClip.youtube_video_id}
              params={`start=${firstClip.start_seconds}&end=${firstClip.end_seconds}`}
            />
          </div>
        )}

        {/* Primary CTA: Watch on Diary of a CEO */}
        {youtubeUrl && (
          <div className="mb-8">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-ink)] px-6 py-2 text-sm font-medium text-[var(--color-paper)] transition-colors hover:bg-[var(--color-ink-2)]"
            >
              Watch on Diary of a CEO ↗
            </a>
          </div>
        )}

        {/* Trigger + Tiny action */}
        {(template.trigger || template.tiny_action) && (
          <div className="mb-8 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 space-y-3">
            {template.trigger && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-ink-3)]">
                  Trigger
                </dt>
                <dd className="mt-1 text-sm text-[var(--color-ink)]">{template.trigger}</dd>
              </div>
            )}
            {template.tiny_action && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-ink-3)]">
                  Tiny Action
                </dt>
                <dd className="mt-1 text-sm text-[var(--color-ink)]">{template.tiny_action}</dd>
              </div>
            )}
          </div>
        )}

        {/* Secondary CTA: Adopt this habit (session-aware) */}
        <div className="mb-8 flex gap-3">
          <AdoptButton templateId={template.id} initialState={adoptionState} />
        </div>

        {/* Report this clip */}
        <div className="mb-8">
          <Link
            href="/legal/dmca"
            className="text-xs text-[var(--color-ink-3)] underline-offset-4 hover:underline"
          >
            Report this clip
          </Link>
        </div>

        {/* Health disclaimer */}
        <div className="border-t border-[var(--color-rule)] pt-4">
          <DisclaimerBanner />
        </div>
      </article>
    </>
  );
}
