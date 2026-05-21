'use client';
import { finalizeInterviewAction } from '@/app/actions/finalize-interview';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
/**
 * AdoptBoard — post-interview habit selection (Phase 03 redesign).
 *
 * Replaces the one-card-at-a-time swipe stack with up to 3 cards shown side by side.
 *  - Adopt → moves the card into "Your starting set"; the freed slot pulls the next
 *    candidate from the queue.
 *  - Swap  → discards the card to the back of the queue and shows the next one
 *    ("show me another", NOT the equivalent-benefit swap — that's a dashboard feature).
 *  - Starting set → plain adopted counter (no cap), remove per habit, and
 *    "Progress to Dashboard" which persists the whole set once via finalizeInterviewAction.
 *
 * Habits are saved only on "Progress to Dashboard"; adopt/remove are local UI state.
 * Full-bleeds out of the narrow onboarding layout to span the viewport width.
 * All colors from CSS var() tokens.
 */
import { useMemo, useReducer, useState } from 'react';
import { AdoptHabitCard, type BoardCandidate } from './AdoptHabitCard';

const VISIBLE = 3;

interface Item {
  candidate: BoardCandidate;
  habitTemplateId: string | null;
  key: number;
}

interface State {
  visible: number[]; // item keys currently shown (length ≤ VISIBLE)
  deck: number[]; // queued item keys not yet shown
  adopted: number[]; // adopted item keys, in adoption order
}

type Action =
  | { type: 'adopt'; index: number }
  | { type: 'swap'; index: number }
  | { type: 'remove'; key: number };

function init(total: number): State {
  const v = Math.min(VISIBLE, total);
  return {
    visible: Array.from({ length: v }, (_, i) => i),
    deck: Array.from({ length: Math.max(0, total - v) }, (_, i) => i + v),
    adopted: [],
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'adopt': {
      const key = state.visible[action.index];
      if (key === undefined) return state;
      const next = state.deck[0];
      if (next !== undefined) {
        return {
          visible: state.visible.map((x, j) => (j === action.index ? next : x)),
          deck: state.deck.slice(1),
          adopted: [...state.adopted, key],
        };
      }
      return {
        visible: state.visible.filter((_, j) => j !== action.index),
        deck: state.deck,
        adopted: [...state.adopted, key],
      };
    }
    case 'swap': {
      const key = state.visible[action.index];
      if (key === undefined) return state;
      const next = state.deck[0];
      if (next === undefined) return state; // nothing to swap to
      return {
        visible: state.visible.map((x, j) => (j === action.index ? next : x)),
        deck: [...state.deck.slice(1), key],
        adopted: state.adopted,
      };
    }
    case 'remove': {
      const adopted = state.adopted.filter((k) => k !== action.key);
      // Return the habit to the deck so it can resurface; fill an empty slot directly
      // if the board isn't full.
      if (state.visible.length < VISIBLE) {
        return { visible: [...state.visible, action.key], deck: state.deck, adopted };
      }
      return { visible: state.visible, deck: [...state.deck, action.key], adopted };
    }
    default:
      return state;
  }
}

interface AdoptBoardProps {
  candidates: BoardCandidate[];
  habitTemplateIds: ReadonlyArray<string | null>;
}

export function AdoptBoard({ candidates, habitTemplateIds }: AdoptBoardProps) {
  const router = useRouter();
  const items = useMemo<Item[]>(
    () =>
      candidates.map((candidate, i) => ({
        candidate,
        habitTemplateId: habitTemplateIds[i] ?? null,
        key: i,
      })),
    [candidates, habitTemplateIds],
  );

  const [state, dispatch] = useReducer(reducer, candidates.length, init);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adoptedItems = state.adopted
    .map((k) => items[k])
    .filter((it): it is Item => it !== undefined);
  const adoptable = adoptedItems.filter((it) => it.habitTemplateId !== null);
  const domainCount = new Set(adoptedItems.map((it) => it.candidate.domain)).size;
  const swapDisabled = state.deck.length === 0;

  async function handleProgress() {
    setSaving(true);
    setError(null);
    try {
      await finalizeInterviewAction(
        adoptable.map((it) => ({ habitTemplateId: it.habitTemplateId as string })),
      );
      router.push('/dashboard');
    } catch (err) {
      console.error('[AdoptBoard] finalize error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save habits.');
      setSaving(false);
    }
  }

  return (
    // Full-bleed: escape the max-w-xl onboarding layout to span the viewport.
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen min-h-screen bg-[var(--color-paper)]">
      <div className="mx-auto max-w-6xl px-6 pb-28 pt-10">
        {/* Header */}
        <p className="mb-3 font-[family-name:var(--font-geist-mono)] text-[10px] tracking-[0.16em] text-[var(--color-ink-4)]">
          — YOUR PERSONALIZED MATCHES
        </p>
        <h1 className="mb-5 max-w-2xl font-[family-name:var(--font-newsreader)] text-[44px] leading-[1.05] tracking-[-0.02em] text-[var(--color-ink)]">
          Pick the habits you want to{' '}
          <span className="italic text-[var(--color-accent)]">start with.</span>
        </h1>
        <p className="mb-10 max-w-xl font-[family-name:var(--font-geist-sans)] text-sm leading-relaxed text-[var(--color-ink-3)]">
          Based on what you told us, here are habits matched to your goals. Adopt any that fit, swap
          any that don&apos;t. You can add more from the library later.
        </p>

        {/* Recommended-for-you header + counter */}
        <div className="mb-5 flex items-baseline justify-between border-b border-[var(--color-rule)] pb-3">
          <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[var(--color-ink)]">
            Recommended for <span className="italic">you</span>
          </h2>
          <p className="font-[family-name:var(--font-geist-mono)] text-[10px] tracking-[0.12em] text-[var(--color-ink-4)]">
            {state.visible.length} CANDIDATE{state.visible.length === 1 ? '' : 'S'} ·{' '}
            {state.deck.length} MORE IN QUEUE
          </p>
        </div>

        {/* Card grid */}
        {state.visible.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {state.visible.map((key, i) => {
              const item = items[key];
              if (!item) return null;
              return (
                <AdoptHabitCard
                  key={key}
                  candidate={item.candidate}
                  onAdopt={() => dispatch({ type: 'adopt', index: i })}
                  onSwap={() => dispatch({ type: 'swap', index: i })}
                  swapDisabled={swapDisabled}
                />
              );
            })}
          </div>
        ) : (
          <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-rule)] px-6 py-10 text-center font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink-3)]">
            You&apos;ve reviewed all your matches. Adopt the ones in your starting set below, or run
            the interview again from Settings.
          </p>
        )}

        {/* Your starting set */}
        <section className="mt-14">
          <div className="mb-4 flex items-baseline gap-3 border-b border-[var(--color-rule)] pb-3">
            <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[var(--color-ink)]">
              Your starting set
            </h2>
            <span className="font-[family-name:var(--font-newsreader)] text-2xl text-[var(--color-accent)]">
              {adoptedItems.length}
            </span>
            <span className="ml-auto font-[family-name:var(--font-geist-mono)] text-[10px] tracking-[0.12em] text-[var(--color-ink-4)]">
              START WITH ONE. YOU CAN ADD MORE ANYTIME.
            </span>
          </div>

          {adoptedItems.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {adoptedItems.map((it) => (
                <li
                  key={it.key}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-paper-2)] px-4 py-3"
                >
                  <span
                    className="block h-2 w-2 flex-shrink-0 rounded-full bg-[var(--color-accent)]"
                    aria-hidden="true"
                  />
                  <span className="font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink)]">
                    {it.candidate.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'remove', key: it.key })}
                    className="ml-auto font-[family-name:var(--font-geist-sans)] text-xs text-[var(--color-ink-3)] underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
                    aria-label={`Remove ${it.candidate.title}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-rule)] px-6 py-8 text-center font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink-3)]">
              Nothing adopted yet. Tap <span className="font-semibold">Adopt</span> on a card above
              to start building your set.
            </p>
          )}

          {adoptedItems.length > adoptable.length && (
            <p className="mt-3 font-[family-name:var(--font-geist-sans)] text-xs text-[var(--color-ink-3)]">
              {adoptedItems.length - adoptable.length} adopted{' '}
              {adoptedItems.length - adoptable.length === 1 ? 'habit' : 'habits'} couldn&apos;t be
              linked to a template and will be skipped.
            </p>
          )}
        </section>
      </div>

      {/* Sticky footer bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--color-rule)] bg-[var(--color-paper)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <p className="font-[family-name:var(--font-geist-mono)] text-[10px] tracking-[0.12em] text-[var(--color-ink-4)]">
            ADOPTED <span className="text-base text-[var(--color-ink)]">{adoptedItems.length}</span>{' '}
            · ACROSS {domainCount} DOMAIN{domainCount === 1 ? '' : 'S'}
          </p>
          <div className="flex items-center gap-4">
            {error && (
              <span role="alert" className="text-sm text-red-600">
                {error}
              </span>
            )}
            <Button
              onClick={handleProgress}
              disabled={adoptable.length === 0 || saving}
              aria-label="Progress to dashboard"
            >
              {saving ? 'Saving…' : 'Progress to Dashboard →'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
