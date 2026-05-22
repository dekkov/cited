'use client';

import { acceptSwapAction } from '@/app/actions/accept-swap';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

export function SwapPanel({ userHabitId }: SwapPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<SwapReason | null>(null);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<SwapCandidateData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);

  async function handleSubmitReason() {
    if (!selectedReason) return;
    setLoading(true);
    setError(null);

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
      // Reset state on close
      setSelectedReason(null);
      setCandidates([]);
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Swap this habit</Button>
      </DialogTrigger>

      {/* Panel: right-side slide-in on desktop, fullscreen on mobile */}
      <DialogContent
        className="
          fixed right-0 top-0 h-full w-full overflow-y-auto
          sm:w-[480px] sm:rounded-l-2xl sm:rounded-r-none
          bg-[var(--color-paper-2)] border-l border-[var(--color-rule)]
          data-[state=open]:slide-in-from-right
          data-[state=closed]:slide-out-to-right
        "
        aria-label="Equivalent-benefit swap"
      >
        <DialogHeader className="mb-4">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-accent)]">
            Equivalent-Benefit Swap
          </p>
          <DialogTitle className="text-xl font-[family-name:var(--font-newsreader)]">
            Find a better fit
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--color-ink-3)]">
            Tell us why this habit isn't working — we'll find something that delivers the same
            benefit in a different way.
          </DialogDescription>
        </DialogHeader>

        {/* Reason chips */}
        {candidates.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-[var(--color-ink)]">Why do you want to swap?</p>
            <div className="flex flex-wrap gap-2">
              {SWAP_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedReason(r)}
                  className={`
                    rounded-full border px-4 py-2 text-sm transition-colors
                    ${
                      selectedReason === r
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                        : 'border-[var(--color-rule)] bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]'
                    }
                  `}
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
          </div>
        )}

        {/* Candidates */}
        {candidates.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-[var(--color-ink)]">
              Here are {candidates.length} alternative{candidates.length !== 1 ? 's' : ''} — all
              backed by credentialed evidence:
            </p>

            {candidates.map((c) => (
              <div
                key={c.templateId}
                className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper)] p-4 space-y-3"
              >
                <h3 className="font-[family-name:var(--font-newsreader)] text-lg font-medium text-[var(--color-ink)]">
                  {c.title}
                </h3>

                {c.citations[0] && (
                  <blockquote className="border-l-2 border-[var(--color-accent)] pl-3">
                    <p className="font-[family-name:var(--font-newsreader)] text-sm italic text-[var(--color-ink-2)]">
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

            <Button variant="ghost" className="w-full" onClick={() => setCandidates([])}>
              ← Try a different reason
            </Button>
          </div>
        )}

        {candidates.length === 0 && !loading && selectedReason === null && (
          <p className="text-sm text-[var(--color-ink-3)] mt-4">
            Can't find a suitable alternative? Try browsing all habits in your domain.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
