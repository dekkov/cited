'use client';
/**
 * RecommendationStack — full-screen swipe stack (D-04, D-05, D-06).
 *
 * One card at a time; swipe right = adopt (onAdopt), swipe left = skip.
 * Keyboard and pointer (mouse/touch) swipe handlers; no framer-motion dep.
 * Confetti/check animation (~0.5s) on adopt via CSS class and inline style.
 * After all candidates processed → AdoptionSummary.
 *
 * templateIdMap is passed from the server page (habit_templates DB lookup)
 * so AdoptionSummary can call finalizeInterviewAction correctly.
 *
 * All colors from CSS var() tokens.
 */
import { useState, useRef } from 'react';
import type { HabitCandidate } from '@cited/core';
import { HabitCandidateCard } from './HabitCandidateCard';
import { AdoptionSummary } from './AdoptionSummary';

type AnimState = 'idle' | 'adopt' | 'skip';

interface CandidateWithMeta extends HabitCandidate {
  citations: Array<{
    clipId: string;
    claim: string;
    speaker: string;
    youtubeVideoId?: string | undefined;
    startSeconds?: number | undefined;
  }>;
}

interface RecommendationStackProps {
  candidates: CandidateWithMeta[];
  templateIdMap?: Readonly<Record<string, string>>;
}

export function RecommendationStack({
  candidates,
  templateIdMap = {},
}: RecommendationStackProps) {
  const [index, setIndex] = useState(0);
  const [adopted, setAdopted] = useState<HabitCandidate[]>([]);
  const [animState, setAnimState] = useState<AnimState>('idle');

  // Pointer swipe tracking (no framer-motion dep)
  const pointerStartX = useRef<number | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    pointerStartX.current = e.clientX;
  }

  function onPointerUp(e: React.PointerEvent) {
    if (pointerStartX.current === null) return;
    const delta = e.clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (delta > 60) onAdopt();
    else if (delta < -60) onSkip();
  }

  // Render done state
  if (index >= candidates.length) {
    return <AdoptionSummary adopted={adopted} templateIdMap={templateIdMap} />;
  }

  const current = candidates[index]!;

  function onAdopt() {
    setAnimState('adopt');
    setTimeout(() => {
      setAdopted((prev) => [...prev, current]);
      setIndex((i) => i + 1);
      setAnimState('idle');
    }, 500);
  }

  function onSkip() {
    setAnimState('skip');
    setTimeout(() => {
      setIndex((i) => i + 1);
      setAnimState('idle');
    }, 300);
  }

  return (
    <main
      className="min-h-screen bg-[var(--color-paper)] flex flex-col items-center justify-center p-5 gap-4"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {/* Progress eyebrow */}
      <p className="font-[family-name:var(--font-geist-mono)] text-[10px] tracking-[0.12em] text-[var(--color-ink-4)]">
        {index + 1} / {candidates.length}
      </p>

      <HabitCandidateCard
        candidate={current}
        animState={animState}
        onAdopt={onAdopt}
        onSkip={onSkip}
      />

      {/* Keyboard hint */}
      <p className="font-[family-name:var(--font-geist-mono)] text-[10px] tracking-[0.08em] text-[var(--color-ink-4)]">
        Swipe right to adopt · swipe left to skip
      </p>
    </main>
  );
}
