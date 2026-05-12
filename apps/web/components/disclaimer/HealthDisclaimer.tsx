type Variant = 'card' | 'page' | 'footer';

export interface HealthDisclaimerProps {
  variant?: Variant;
}

export function HealthDisclaimer({ variant = 'card' }: HealthDisclaimerProps) {
  const cls =
    variant === 'page'
      ? 'text-sm leading-relaxed'
      : variant === 'footer'
        ? 'text-xs'
        : 'text-xs';
  return (
    <div
      role="note"
      aria-label="Health disclaimer"
      className={`${cls} text-[color:var(--color-ink-3)] border-l-2 border-[color:var(--color-rule)] pl-3`}
      data-variant={variant}
    >
      <strong className="font-semibold text-[color:var(--color-ink-2)]">
        This is not medical advice.
      </strong>{' '}
      Habits surfaced here are evidence-informed but general. See a clinician for medical
      questions specific to your situation. Do not start, stop, or change prescribed treatment
      based on this content.
    </div>
  );
}
