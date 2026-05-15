'use client';
/**
 * SynthesisLoader — full-screen "Analyzing your profile…" shown after the
 * interview completes and while Sonnet synthesizes recommendations. See D-03.
 *
 * The loader displays for at least 500ms then calls onComplete() to advance
 * to the "Tell me more" step. Actual synthesis happens in TellMeMore's
 * onSubmit handler (POST /api/synthesize).
 *
 * All colors from CSS var() tokens.
 */
import { useEffect } from 'react';

interface SynthesisLoaderProps {
  onComplete: () => void;
}

export function SynthesisLoader({ onComplete }: SynthesisLoaderProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-5 py-12">
      {/* Animated sage dots */}
      <div className="flex gap-2" role="status" aria-label="Analyzing your profile">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-3 w-3 rounded-full bg-[var(--color-accent)]"
            style={{
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
            aria-hidden="true"
          />
        ))}
      </div>
      <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-[var(--color-ink)] text-center">
        Analyzing your profile…
      </h2>
      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink-3)] text-center max-w-xs">
        Finding the habits most likely to make a difference for you.
      </p>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
