'use client';

import { acceptSwapAction } from '@/app/actions/accept-swap';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type SwapReason = 'too_hard' | 'dislike' | 'schedule_conflict' | 'other';

const REASON_LABELS: Record<SwapReason, string> = {
  too_hard: 'Too hard',
  dislike: "Doesn't resonate",
  schedule_conflict: 'Schedule conflict',
  other: 'Other reason',
};

const SWAP_REASONS: SwapReason[] = ['too_hard', 'dislike', 'schedule_conflict', 'other'];

type SwapCitationData = {
  clipId: string;
  claim: string;
  speaker: string;
};

type SwapCandidateData = {
  templateId: string;
  slug: string;
  title: string;
  clusterId: number | null;
  minCosDistance: number;
  citations: SwapCitationData[];
};

interface SwapPanelProps {
  userHabitId: string;
}

// Side-anchored sheet (not centered dialog) — Radix Dialog with proper
// slide-from-right semantics so the reason picker isn't clipped above viewport.
export function SwapPanel({ userHabitId }: SwapPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<SwapReason | null>(null);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<SwapCandidateData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmitReason() {
    if (!selectedReason) return;
    setLoading(true);
    setError(null);
    setSubmitted(true);

    try {
      const res = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userHabitId, reason: selectedReason }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to fetch swap candidates');
      }

      const { candidates: data } = (await res.json()) as { candidates: SwapCandidateData[] };
      setCandidates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptSwap(newTemplateId: string) {
    setAccepting(newTemplateId);
    try {
      await acceptSwapAction({ userHabitId, newTemplateId });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept swap');
    } finally {
      setAccepting(null);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Reset state on close so reopen starts fresh
      setSelectedReason(null);
      setCandidates([]);
      setError(null);
      setSubmitted(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline">Swap this habit</Button>
      </SheetTrigger>

      <SheetContent side="right" aria-label="Equivalent-benefit swap">
        <SheetHeader>
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-accent)]">
            Equivalent-Benefit Swap
          </p>
          <SheetTitle>Find a better fit</SheetTitle>
          <SheetDescription>
            Tell us why this habit isn't working — we'll find something that delivers the same
            benefit in a different way.
          </SheetDescription>
        </SheetHeader>

        {/* ─── Reason picker (visible until a search returns results) ─────── */}
        {candidates.length === 0 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm font-medium text-[var(--color-ink)]">Why do you want to swap?</p>
            <div className="flex flex-wrap gap-2">
              {SWAP_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedReason(r)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    selectedReason === r
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                      : 'border-[var(--color-rule)] bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]'
                  }`}
                >
                  {REASON_LABELS[r]}
                </button>
              ))}
            </div>

            {/* No free-text input — reasonText deferred to Phase 4 (AUTH-05c) */}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              onClick={handleSubmitReason}
              disabled={!selectedReason || loading}
              className="w-full"
            >
              {loading ? 'Finding alternatives…' : 'Find alternatives'}
            </Button>

            {submitted && !loading && candidates.length === 0 && !error && (
              <p className="text-sm text-[var(--color-ink-3)]">
                We couldn't find a substantively different alternative right now. The current habit
                may already be the best fit for your goals — or our library is still growing. Try
                browsing all habits in your domain.
              </p>
            )}
          </div>
        )}

        {/* ─── Candidates (rendered after a successful search) ─────────────── */}
        {candidates.length > 0 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm font-medium text-[var(--color-ink)]">
              Here{' '}
              {candidates.length === 1
                ? 'is 1 alternative'
                : `are ${candidates.length} alternatives`}{' '}
              — all backed by credentialed evidence:
            </p>

            {candidates.map((c) => (
              <div
                key={c.templateId}
                className="space-y-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] p-4"
              >
                <h3 className="text-lg font-medium text-[var(--color-ink)] font-[family-name:var(--font-newsreader)]">
                  {c.title}
                </h3>

                {c.citations[0] && (
                  <blockquote className="border-l-2 border-[var(--color-accent)] pl-3">
                    <p className="text-sm italic text-[var(--color-ink-2)] font-[family-name:var(--font-newsreader)]">
                      "{c.citations[0].claim}"
                    </p>
                    <footer className="mt-1 text-xs text-[var(--color-ink-3)]">
                      — {c.citations[0].speaker}
                    </footer>
                  </blockquote>
                )}

                {c.citations.length >= 2 && (
                  <p className="text-xs text-[var(--color-ink-3)]">
                    {c.citations.length} validated citations
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptSwap(c.templateId)}
                    disabled={accepting !== null}
                    className="flex-1"
                  >
                    {accepting === c.templateId ? 'Adopting…' : 'Use this instead'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenChange(false)}
                    disabled={accepting !== null}
                  >
                    Keep current
                  </Button>
                </div>
              </div>
            ))}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setCandidates([]);
                setSubmitted(false);
              }}
            >
              ← Try a different reason
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
