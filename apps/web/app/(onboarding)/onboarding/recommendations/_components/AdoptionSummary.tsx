'use client';
/**
 * AdoptionSummary — shown after all candidates are processed.
 * Displays adopted count, list of habit titles, and a "Continue to dashboard"
 * button that calls finalizeInterviewAction then redirects to /dashboard.
 *
 * templateIdMap maps templateSlug → habitTemplateId UUID (from DB lookup in
 * recommendations/page.tsx). Required for finalizeInterviewAction.
 *
 * All colors from CSS var() tokens.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { finalizeInterviewAction } from '@/app/actions/finalize-interview';
import type { HabitCandidate } from '@cited/core';

interface AdoptionSummaryProps {
  adopted: HabitCandidate[];
  templateIdMap: Readonly<Record<string, string>>;
}

export function AdoptionSummary({ adopted, templateIdMap }: AdoptionSummaryProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await finalizeInterviewAction(
        adopted.map(({ templateSlug }) => ({ templateSlug })),
        templateIdMap,
      );
      router.push('/dashboard');
    } catch (err) {
      console.error('[AdoptionSummary] finalize error:', err);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 px-5 py-10">
      {/* Heading */}
      <h2 className="font-[family-name:var(--font-newsreader)] text-3xl text-[var(--color-ink)]">
        {adopted.length} {adopted.length === 1 ? 'habit' : 'habits'} adopted
      </h2>

      {/* Adopted habit list */}
      {adopted.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {adopted.map((h) => (
            <li
              key={h.templateSlug}
              className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-paper-2)] px-4 py-3"
            >
              {/* Sage check dot */}
              <span
                className="block h-2 w-2 rounded-full bg-[var(--color-accent)] flex-shrink-0"
                aria-hidden="true"
              />
              <span className="font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink)]">
                {h.title}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink-3)]">
          You didn&apos;t adopt any habits. You can always browse recommendations again.
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full"
          aria-label="Continue to dashboard"
        >
          {loading ? 'Saving…' : 'Continue to dashboard'}
        </Button>
        <a
          href="/onboarding/interview"
          className="text-center font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink-3)] underline-offset-2 hover:underline"
        >
          Start over
        </a>
      </div>
    </div>
  );
}
