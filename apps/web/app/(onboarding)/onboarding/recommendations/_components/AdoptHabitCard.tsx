'use client';
import { Button } from '@/components/ui/button';
import type { HabitCandidate } from '@cited/core';
/**
 * AdoptHabitCard — one recommendation in the adopt board (Phase 03 redesign).
 *
 * Vertical card matching the dashboard card aesthetic, with two actions:
 *  - Adopt → moves the card into "Your starting set"
 *  - Swap  → replaces this card with the next candidate in the queue
 *
 * Renders only the fields we actually have (domain, title, rationale, clip,
 * first citation claim + speaker, trigger, tiny action). No fabricated
 * episode/credential/frequency metadata. Clip is tap-to-play (HAB-05: no autoplay).
 * All colors from CSS var() tokens.
 */
import { YouTubeEmbed } from '@next/third-parties/google';

export interface BoardCitation {
  clipId: string;
  claim: string;
  speaker: string;
  youtubeVideoId?: string | undefined;
  startSeconds?: number | undefined;
}

export type BoardCandidate = Omit<HabitCandidate, 'citations'> & {
  citations: BoardCitation[];
};

const DOMAIN_LABELS: Record<string, string> = {
  sleep: 'SLEEP',
  nutrition_gut: 'NUTRITION & GUT',
  exercise_longevity: 'EXERCISE & LONGEVITY',
  mental_health: 'MENTAL HEALTH',
};

interface AdoptHabitCardProps {
  candidate: BoardCandidate;
  onAdopt: () => void;
  onSwap: () => void;
  swapDisabled: boolean;
}

export function AdoptHabitCard({ candidate, onAdopt, onSwap, swapDisabled }: AdoptHabitCardProps) {
  const firstCitation = candidate.citations[0];

  return (
    <article className="flex flex-col rounded-[var(--radius-xl)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-6 shadow-[var(--shadow-card)]">
      {/* Domain eyebrow */}
      <p className="mb-2 font-[family-name:var(--font-geist-mono)] text-[10px] tracking-[0.16em] text-[var(--color-accent)]">
        {DOMAIN_LABELS[candidate.domain] ?? candidate.domain.toUpperCase()}
      </p>

      {/* Title — clamped to 2 lines with reserved height so cards align in the grid */}
      <h3 className="mb-3 line-clamp-2 min-h-[2.75em] font-[family-name:var(--font-newsreader)] text-[24px] leading-snug text-[var(--color-ink)]">
        {candidate.title}
      </h3>

      {/* Rationale — clamped to 3 lines with reserved height to keep the clip aligned */}
      <p className="mb-4 line-clamp-3 min-h-[4.875em] font-[family-name:var(--font-geist-sans)] text-sm leading-relaxed text-[var(--color-ink-2)]">
        {candidate.rationale}
      </p>

      {/* Clip thumbnail — tap-to-play only (HAB-05: no autoplay) */}
      {firstCitation?.youtubeVideoId && (
        <div className="mb-4 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-paper-2)]">
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

      {/* Claim quote + speaker */}
      {firstCitation && (
        <blockquote className="mb-4 border-l-2 border-[var(--color-accent)] pl-3">
          <p className="font-[family-name:var(--font-newsreader)] text-[17px] italic leading-relaxed text-[var(--color-ink-2)]">
            &ldquo;{firstCitation.claim}&rdquo;
          </p>
          <footer className="mt-1 font-[family-name:var(--font-geist-sans)] text-[13.5px] font-semibold text-[var(--color-ink-3)]">
            — {firstCitation.speaker}
          </footer>
        </blockquote>
      )}

      {/* Trigger + tiny action */}
      <p className="mb-1 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink-2)]">
        <span className="mr-1 font-[family-name:var(--font-geist-mono)] text-[10px] tracking-[0.12em] text-[var(--color-ink-4)]">
          WHEN
        </span>
        {candidate.trigger}
      </p>
      <p className="mb-5 font-[family-name:var(--font-geist-sans)] text-sm font-semibold text-[var(--color-ink)]">
        <span className="mr-1 font-[family-name:var(--font-geist-mono)] text-[10px] tracking-[0.12em] text-[var(--color-ink-4)]">
          ACTION
        </span>
        {candidate.tinyAction}
      </p>

      {/* Actions — pinned to the bottom so cards align in the grid */}
      <div className="mt-auto flex gap-3">
        <Button onClick={onAdopt} className="flex-1" aria-label={`Adopt ${candidate.title}`}>
          ✓ Adopt
        </Button>
        <Button
          variant="outline"
          onClick={onSwap}
          disabled={swapDisabled}
          aria-label={`Swap ${candidate.title}`}
        >
          ⇄ Swap
        </Button>
      </div>
    </article>
  );
}
