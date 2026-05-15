'use client';
/**
 * TellMeMore — the optional free-text step after synthesis loading (D-03).
 *
 * If allowFreeText (AUTH-05c consent granted): shows textarea with the exact
 * prompt from the spec. Otherwise: skip link directly.
 *
 * onSubmit receives the free-text content (empty string = skip).
 * All colors from CSS var() tokens.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface TellMeMoreProps {
  allowFreeText: boolean;
  onSubmit: (text: string) => void;
}

const PLACEHOLDER = 'e.g. eating habits, work schedule, why you developed certain habits';

export function TellMeMore({ allowFreeText, onSubmit }: TellMeMoreProps) {
  const [text, setText] = useState('');

  return (
    <div className="flex flex-col gap-5 px-5 py-8">
      <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[var(--color-ink)]">
        One last thing…
      </h2>

      <p className="font-[family-name:var(--font-geist-sans)] text-base text-[var(--color-ink-2)] leading-relaxed">
        {"Anything else you'd like to share for better recommendations?"}
        {allowFreeText && (
          <span className="block text-sm text-[var(--color-ink-3)] mt-1">
            {PLACEHOLDER}
          </span>
        )}
      </p>

      {allowFreeText && (
        <textarea
          className="
            w-full rounded-[var(--radius-md)] border border-[var(--color-rule)]
            bg-[var(--color-paper-2)] p-3
            font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink)]
            placeholder:text-[var(--color-ink-4)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]
            resize-none
          "
          rows={4}
          maxLength={2000}
          placeholder={PLACEHOLDER}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Additional context for recommendations"
        />
      )}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={() => onSubmit(text)}
          className="w-full"
        >
          Continue
        </Button>
        <button
          type="button"
          onClick={() => onSubmit('')}
          className="
            font-[family-name:var(--font-geist-sans)] text-sm
            text-[var(--color-ink-3)] underline-offset-2 hover:underline
            text-center
          "
        >
          Skip
        </button>
      </div>
    </div>
  );
}
