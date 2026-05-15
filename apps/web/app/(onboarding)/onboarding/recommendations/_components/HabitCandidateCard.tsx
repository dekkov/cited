'use client';
/**
 * HabitCandidateCard — D-06 face spec for the swipe stack.
 *
 * Content: title (Newsreader), claim quote (Newsreader italic), domain badge
 * (mono eyebrow), trigger, tiny action, clip thumbnail via <YouTubeEmbed>
 * (tap-to-play, NO auto-play — HAB-05), speaker name, two action buttons.
 *
 * animState controls the CSS class for swipe animations:
 *  'adopt'  → .adopt-animation (translateX right + check overlay)
 *  'skip'   → .skip-animation (translateX left)
 *  'idle'   → no animation
 *
 * All colors from CSS var() tokens — no hex codes.
 */
import { YouTubeEmbed } from '@next/third-parties/google';
import { Button } from '@/components/ui/button';
import type { HabitCandidate } from '@cited/core';

const DOMAIN_LABELS: Record<string, string> = {
  sleep: 'SLEEP',
  nutrition_gut: 'NUTRITION & GUT',
  exercise_longevity: 'EXERCISE & LONGEVITY',
  mental_health: 'MENTAL HEALTH',
};

interface HabitCandidateCardProps {
  candidate: HabitCandidate & {
    citations: Array<{
      clipId: string;
      claim: string;
      speaker: string;
      youtubeVideoId?: string | undefined;
      startSeconds?: number | undefined;
    }>;
  };
  animState: 'idle' | 'adopt' | 'skip';
  onAdopt: () => void;
  onSkip: () => void;
}

export function HabitCandidateCard({
  candidate,
  animState,
  onAdopt,
  onSkip,
}: HabitCandidateCardProps) {
  const firstCitation = candidate.citations[0];
  const animClass =
    animState === 'adopt'
      ? 'adopt-animation'
      : animState === 'skip'
        ? 'skip-animation'
        : '';

  return (
    <div
      className={`
        relative w-full max-w-sm rounded-[var(--radius-xl)]
        border border-[var(--color-rule)] bg-[var(--color-paper)]
        p-6 shadow-[var(--shadow-card)]
        transition-transform duration-500 ease-out
        ${animClass}
      `}
      style={{
        transform:
          animState === 'adopt'
            ? 'translateX(120%) rotate(6deg)'
            : animState === 'skip'
              ? 'translateX(-120%) rotate(-6deg)'
              : 'translateX(0)',
      }}
    >
      {/* Domain eyebrow */}
      <p className="font-[family-name:var(--font-geist-mono)] text-[10px] tracking-[0.16em] text-[var(--color-accent)] mb-2">
        {DOMAIN_LABELS[candidate.domain] ?? candidate.domain.toUpperCase()}
      </p>

      {/* Title */}
      <h2 className="font-[family-name:var(--font-newsreader)] text-[26px] leading-snug text-[var(--color-ink)] mb-3">
        {candidate.title}
      </h2>

      {/* Claim quote (Newsreader italic) */}
      {firstCitation && (
        <blockquote className="border-l-2 border-[var(--color-accent)] pl-3 mb-3">
          <p className="font-[family-name:var(--font-newsreader)] text-[17px] italic leading-relaxed text-[var(--color-ink-2)]">
            &ldquo;{firstCitation.claim}&rdquo;
          </p>
          {/* Speaker name */}
          <footer className="mt-1 font-[family-name:var(--font-geist-sans)] text-[13.5px] font-semibold text-[var(--color-ink-3)]">
            — {firstCitation.speaker}
          </footer>
        </blockquote>
      )}

      {/* Clip thumbnail — tap-to-play only (HAB-05: no auto-play) */}
      {firstCitation?.youtubeVideoId && (
        <div className="rounded-[var(--radius-md)] overflow-hidden mb-3 bg-[var(--color-paper-2)]">
          <YouTubeEmbed
            videoid={firstCitation.youtubeVideoId}
            params={
              firstCitation.startSeconds !== undefined
                ? `start=${firstCitation.startSeconds}&rel=0`
                : 'rel=0'
            }
          />
        </div>
      )}

      {/* Trigger */}
      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink-2)] mb-1">
        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tracking-[0.12em] text-[var(--color-ink-4)] mr-1">
          WHEN
        </span>
        {candidate.trigger}
      </p>

      {/* Tiny action */}
      <p className="font-[family-name:var(--font-geist-sans)] text-sm font-semibold text-[var(--color-ink)] mb-5">
        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tracking-[0.12em] text-[var(--color-ink-4)] mr-1">
          ACTION
        </span>
        {candidate.tinyAction}
      </p>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onSkip}
          className="flex-1"
          aria-label="Skip this habit"
        >
          Skip
        </Button>
        <Button
          onClick={onAdopt}
          className="flex-1"
          aria-label="Adopt this habit"
        >
          Adopt
        </Button>
      </div>

      {/* Adopt check overlay */}
      {animState === 'adopt' && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-xl)] bg-[var(--color-accent)] bg-opacity-20"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-16 w-16 text-[var(--color-accent)]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );
}
