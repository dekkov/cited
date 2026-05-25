'use client';

import { Badge } from '@/components/ui/badge';
import { YouTubeEmbed } from '@next/third-parties/google';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { RemoveHabitButton } from './RemoveHabitButton';
import { SwapPanel } from './SwapPanel';

type ClipData = {
  id: string;
  claim: string;
  rationale: string | null;
  speaker: string;
  speakerStatus: string;
  riskFlags: string[];
  startSeconds: number;
  endSeconds: number;
  youtubeVideoId: string;
  episode: {
    title: string | null;
    publishedAt: string | null;
  } | null;
};

type TemplateData = {
  id: string;
  title: string;
  description: string | null;
  domain: string;
  trigger: string | null;
  tinyAction: string | null;
  clusterId: number | null;
};

interface HabitDetailProps {
  habitId: string;
  template: TemplateData;
  clip: ClipData | null;
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

export function HabitDetail({ habitId, template, clip }: HabitDetailProps) {
  const youtubeUrl = clip
    ? `https://www.youtube.com/watch?v=${clip.youtubeVideoId}&t=${clip.startSeconds}s`
    : null;

  const hasRiskFlags = clip && clip.riskFlags.length > 0;

  return (
    <article className="max-w-2xl space-y-6">
      {/* Back to dashboard */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-3)] transition-colors hover:text-[var(--color-ink)]"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      {/* Domain badge */}
      <div>
        <Badge variant="outline" className="text-xs uppercase tracking-wider">
          {DOMAIN_LABELS[template.domain] ?? template.domain}
        </Badge>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-[family-name:var(--font-newsreader)] leading-tight text-[var(--color-ink)]">
        {template.title}
      </h1>

      {/* Risk flag banner */}
      {hasRiskFlags && (
        <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            This habit involves content flagged as {clip.riskFlags.join(', ')}. Always consult a
            qualified clinician before making health decisions.
          </span>
        </div>
      )}

      {/* Claim block-quote */}
      {clip && (
        <blockquote className="relative border-l-4 border-[var(--color-accent)] pl-4">
          <span className="absolute -left-2 top-0 text-4xl leading-none text-[var(--color-accent)] opacity-60">
            &ldquo;
          </span>
          <p className="font-[family-name:var(--font-newsreader)] text-xl italic leading-relaxed text-[var(--color-ink)]">
            {clip.claim}
          </p>
        </blockquote>
      )}

      {/* Speaker + episode attribution */}
      {clip && (
        <div className="space-y-1 text-sm text-[var(--color-ink-3)]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--color-ink-2)]">{clip.speaker}</span>
            {clip.speakerStatus === 'verified' && (
              <Badge variant="secondary" className="text-xs">
                Verified
              </Badge>
            )}
            {clip.speakerStatus === 'host' && (
              <Badge variant="secondary" className="text-xs">
                Host
              </Badge>
            )}
          </div>
          {clip.episode && (
            <p>
              {clip.episode.title && <span className="italic">{clip.episode.title}</span>}
              {clip.episode.title && clip.episode.publishedAt && ' · '}
              {clip.episode.publishedAt && <span>{formatDate(clip.episode.publishedAt)}</span>}
            </p>
          )}
        </div>
      )}

      {/* YouTubeEmbed — hero mode (200px). HAB-05: params must include start+end; no autoplay. */}
      {clip && (
        <div className="overflow-hidden rounded-lg" style={{ height: '200px' }}>
          <YouTubeEmbed
            videoid={clip.youtubeVideoId}
            params={`start=${clip.startSeconds}&end=${clip.endSeconds}`}
          />
        </div>
      )}

      {/* Watch on Diary of a CEO CTA */}
      {youtubeUrl && (
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-accent)] underline-offset-4 hover:underline"
        >
          Watch on Diary of a CEO ↗
        </a>
      )}

      {/* Trigger + Tiny action */}
      {(template.trigger || template.tinyAction) && (
        <div className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 space-y-2">
          {template.trigger && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-ink-3)]">
                Trigger
              </dt>
              <dd className="mt-1 text-sm text-[var(--color-ink)]">{template.trigger}</dd>
            </div>
          )}
          {template.tinyAction && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-ink-3)]">
                Tiny Action
              </dt>
              <dd className="mt-1 text-sm text-[var(--color-ink)]">{template.tinyAction}</dd>
            </div>
          )}
        </div>
      )}

      {/* Swap + Remove actions */}
      <div className="space-y-3 border-t border-[var(--color-rule)] pt-4">
        <SwapPanel userHabitId={habitId} />
        <RemoveHabitButton userHabitId={habitId} />
      </div>
    </article>
  );
}
