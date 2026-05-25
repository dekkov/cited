'use client';

import { archiveHabitAction } from '@/app/actions/archive-habit';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

interface RemoveHabitButtonProps {
  userHabitId: string;
}

// Soft-delete via archiveHabitAction (sets status='archived', active=false).
// Two-step confirm — first click prompts, second commits — avoids pulling in
// AlertDialog for a single destructive action.
export function RemoveHabitButton({ userHabitId }: RemoveHabitButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setSubmitting(true);
    setError(null);
    try {
      await archiveHabitAction({ userHabitId });
      // Hard nav — router.push + router.refresh raced on this transition and
      // sometimes left the user on the now-archived /habits/[id] page.
      // window.location guarantees a fresh document and re-fetches dashboard data.
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove habit');
      setSubmitting(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        variant="outline"
        onClick={() => setConfirming(true)}
        className="border-red-300 text-red-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 className="mr-1.5 size-4" />
        Remove this habit
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-[var(--color-ink-2)]">
        Remove from your active habits? Your check-ins stay in your history.
      </span>
      <Button variant="destructive" size="sm" onClick={handleRemove} disabled={submitting}>
        {submitting ? 'Removing…' : 'Confirm remove'}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={submitting}>
        Cancel
      </Button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}
