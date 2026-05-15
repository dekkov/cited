/**
 * ChoiceChips — renders 2–4 answer chips for a single interview turn.
 * Chips use Geist Mono eyebrow styling; ink-on-paper base; hover lifts 1px.
 * Selecting a chip calls onSelect with the full choice object.
 * All colors from CSS var() tokens.
 */

interface Choice {
  id: string;
  label: string;
}

interface ChoiceChipsProps {
  choices: Choice[];
  onSelect: (choice: Choice) => void;
  disabled?: boolean;
}

export function ChoiceChips({ choices, onSelect, disabled = false }: ChoiceChipsProps) {
  return (
    <div
      role="group"
      aria-label="Answer choices"
      className="mt-6 flex flex-col gap-2"
    >
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(choice)}
          className="
            w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)]
            bg-[var(--color-paper-2)] px-4 py-3
            text-left font-[family-name:var(--font-geist-mono)] text-sm tracking-[0.04em]
            text-[var(--color-ink)]
            transition-all duration-150
            hover:-translate-y-px hover:border-[var(--color-accent)] hover:bg-[var(--color-paper)]
            hover:shadow-[var(--shadow-soft)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
            disabled:cursor-not-allowed disabled:opacity-50
          "
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}
