'use client';
import { checkInAction } from '@/app/actions/check-in';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { CheckInStatus } from '@cited/core';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { GraduationToast } from './GraduationToast';

type Props = {
  readonly userHabitId: string;
};

type StatusOption = {
  readonly value: CheckInStatus;
  readonly label: string;
  readonly description: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'done', label: 'Done', description: 'Completed fully' },
  { value: 'partial', label: 'Partial', description: 'Partially completed' },
  { value: 'skipped', label: 'Skip', description: 'Skipped today' },
];

function statusButtonClasses(value: CheckInStatus, selected: CheckInStatus | null): string {
  const base =
    'flex-1 rounded-full px-4 py-2 font-[family-name:var(--font-geist-sans)] font-medium text-[13px] transition-all border focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1';
  if (selected !== value) {
    return `${base} border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[var(--color-ink-2)]`;
  }
  switch (value) {
    case 'done':
      return `${base} border-[var(--color-accent)] bg-[var(--color-accent)] text-white`;
    case 'partial':
      return `${base} border-[oklch(0.72_0.04_145)] bg-[oklch(0.72_0.04_145)] text-[var(--color-ink)]`;
    case 'skipped':
      return `${base} border-[var(--color-ink-3)] bg-[var(--color-ink-3)] text-white`;
  }
}

/**
 * CheckInSheet — bottom-sheet tri-state check-in (HAB-02, D-08).
 *
 * Layout:
 * - Trigger: ghost capsule "Check in"
 * - Sheet: role="radiogroup" + three role="radio" buttons (Done / Partial / Skip)
 * - Expand arrow reveals optional mood (1–5 pills) + note textarea
 *
 * Post-submit:
 * - freezeApplied → toast.success('1 freeze used — streak preserved')
 * - graduated → shows GraduationToast overlay
 */
export function CheckInSheet({ userHabitId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CheckInStatus | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGraduation, setShowGraduation] = useState(false);

  function reset() {
    setSelected(null);
    setMood(null);
    setNote('');
    setExpanded(false);
  }

  async function handleSubmit() {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      const result = await checkInAction({
        userHabitId,
        status: selected,
        mood: mood ?? undefined,
        note: note.trim() || undefined,
      });

      setOpen(false);
      reset();

      if (result.freezeApplied) {
        toast.success('1 freeze used — streak preserved', {
          style: { background: 'var(--color-accent-soft)', color: 'var(--color-ink)' },
        });
      }

      if (result.graduated) {
        setShowGraduation(true);
      }

      router.refresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogTrigger asChild>
          <button
            type="button"
            className="mt-4 w-full rounded-full bg-[var(--color-paper-2)] border border-[var(--color-rule)] px-4 py-2 font-[family-name:var(--font-geist-sans)] font-medium text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] transition-colors"
          >
            Check in
          </button>
        </DialogTrigger>

        <DialogContent
          className="fixed bottom-0 left-0 right-0 top-auto max-w-none rounded-t-[var(--radius-xl)] rounded-b-none bg-[var(--color-paper)] p-6 sm:max-w-sm sm:left-1/2 sm:-translate-x-1/2 sm:bottom-6 sm:rounded-[var(--radius-xl)]"
          style={{ margin: 0 }}
        >
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-geist-sans)] text-base text-[var(--color-ink)]">
              How did it go?
            </DialogTitle>
          </DialogHeader>

          {/* Tri-state radio group (HAB-02, UI-DESIGN.md accessibility) */}
          <div role="radiogroup" aria-label="Check-in status" className="flex gap-2 mt-4">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected === value}
                onClick={() => setSelected(value)}
                className={statusButtonClasses(value, selected)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Expand arrow for optional mood + note */}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="mt-3 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)] transition-colors"
            aria-expanded={expanded}
            aria-label="Toggle mood and note section"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            >
              <path d="M2 4l4 4 4-4" />
            </svg>
            {expanded ? 'Hide' : 'Add mood & note'}
          </button>

          {expanded && (
            <div className="mt-3 space-y-4">
              {/* Mood pills 1–5 */}
              <div>
                <p className="font-mono text-[10px] tracking-[0.08em] text-[var(--color-ink-3)] mb-2 uppercase">
                  Mood
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMood(mood === n ? null : n)}
                      className={`h-9 w-9 rounded-full border font-[family-name:var(--font-geist-sans)] text-sm transition-all ${
                        mood === n
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                          : 'border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[var(--color-ink-2)]'
                      }`}
                      aria-pressed={mood === n}
                      aria-label={`Mood ${n} out of 5`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note textarea */}
              <div>
                <p className="font-mono text-[10px] tracking-[0.08em] text-[var(--color-ink-3)] mb-2 uppercase">
                  Note
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="How did it feel? (stored only if AI analysis consent is on)"
                  className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-3 font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-4)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1"
                  aria-label="Optional note"
                />
                <p className="mt-1 font-mono text-[10px] text-[var(--color-ink-4)]">
                  {note.length}/500 · Stored only if AI analysis consent is enabled
                </p>
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selected || isSubmitting}
            className="mt-6 w-full rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] font-[family-name:var(--font-geist-sans)] font-medium text-sm py-3 hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isSubmitting ? 'Saving…' : 'Save check-in'}
          </button>
        </DialogContent>
      </Dialog>

      {/* Graduation overlay — shown post-check-in when habit hits 21 successes */}
      {showGraduation && (
        <GraduationToast userHabitId={userHabitId} onClose={() => setShowGraduation(false)} />
      )}
    </>
  );
}
