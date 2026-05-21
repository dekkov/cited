'use client';
import { adoptHabitTemplateAction } from '@/app/actions/adopt-habit';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
/**
 * AdoptButton — session-aware adopt CTA for the public /h/[slug] editorial page.
 *
 * Three states (resolved on the server, refined on the client after an adopt):
 *  - logged_out  → "Sign in to adopt" link to /login
 *  - not_adopted → "Adopt this habit" button → adoptHabitTemplateAction
 *  - adopted     → "✓ In your habits" link to /dashboard
 */
import { useState } from 'react';

export type AdoptionState = 'logged_out' | 'not_adopted' | 'adopted';

const FILLED =
  'inline-flex items-center gap-1 rounded-full bg-[var(--color-ink)] px-6 py-2 text-sm font-medium text-[var(--color-paper)] transition-colors hover:bg-[var(--color-ink-2)]';
const OUTLINE =
  'inline-flex items-center gap-1 rounded-full border border-[var(--color-accent)] px-6 py-2 text-sm font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)] hover:text-white disabled:opacity-60';

interface AdoptButtonProps {
  templateId: string;
  initialState: AdoptionState;
}

export function AdoptButton({ templateId, initialState }: AdoptButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<AdoptionState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state === 'logged_out') {
    return (
      <Link href="/login" className={OUTLINE}>
        Sign in to adopt
      </Link>
    );
  }

  if (state === 'adopted') {
    return (
      <Link href="/dashboard" className={FILLED}>
        ✓ In your habits — view dashboard
      </Link>
    );
  }

  async function handleAdopt() {
    setLoading(true);
    setError(null);
    try {
      await adoptHabitTemplateAction(templateId);
      setState('adopted');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not adopt this habit.');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <button type="button" onClick={handleAdopt} disabled={loading} className={OUTLINE}>
        {loading ? 'Adopting…' : 'Adopt this habit'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
