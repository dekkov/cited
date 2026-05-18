'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { archiveHabitAction } from '@/app/actions/archive-habit';
import { GRADUATION_MESSAGE } from '@cited/core';

type Props = {
  readonly userHabitId: string;
  readonly onClose: () => void;
};

/**
 * GraduationToast — shown when checkInAction returns { graduated: true } (D-09).
 *
 * Message: GRADUATION_MESSAGE verbatim ("This habit may now be part of your life 🌱")
 * Buttons:
 *   - "Archive habit" → calls archiveHabitAction + router.push('/onboarding/interview')
 *   - "Keep tracking" → closes the toast without action
 *
 * Rendered as a modal dialog (Radix Dialog) positioned like a toast at bottom of screen.
 */
export function GraduationToast({ userHabitId, onClose }: Props) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);

  async function handleArchive() {
    setIsArchiving(true);
    try {
      await archiveHabitAction({ userHabitId });
      router.push('/onboarding/interview');
    } catch {
      setIsArchiving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Habit graduation"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm"
    >
      <div className="bg-[var(--color-paper)] rounded-[var(--radius-xl)] border border-[var(--color-rule)] p-6 shadow-[var(--shadow-card)] text-center">
        {/* Graduation message — D-09 verbatim */}
        <p className="font-[family-name:var(--font-newsreader)] text-[18px] leading-snug text-[var(--color-ink)] mb-6">
          {GRADUATION_MESSAGE}
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleArchive}
            disabled={isArchiving}
            className="w-full rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] font-[family-name:var(--font-geist-sans)] font-medium text-sm py-3 px-6 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isArchiving ? 'Archiving…' : 'Archive habit'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-[var(--color-rule)] text-[var(--color-ink-2)] font-[family-name:var(--font-geist-sans)] font-medium text-sm py-3 px-6 hover:bg-[var(--color-paper-2)] transition-colors"
          >
            Keep tracking
          </button>
        </div>
      </div>
    </div>
  );
}
