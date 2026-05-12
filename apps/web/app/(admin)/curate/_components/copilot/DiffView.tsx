'use client';

import { diffLines, diffWords } from 'diff';

type Props = {
  before: string;
  after: string;
  mode?: 'word' | 'line';
};

export function DiffView({ before, after, mode = 'word' }: Props) {
  const parts = mode === 'word' ? diffWords(before, after) : diffLines(before, after);
  return (
    <div
      className="text-sm whitespace-pre-wrap leading-6"
      style={{ fontFamily: 'var(--font-geist-sans)' }}
    >
      {parts.map((part, i) => {
        if (part.added) {
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: diff output index is stable for this render
              key={i}
              style={{
                backgroundColor: 'var(--color-accent-soft)',
                color: 'var(--color-accent-deep)',
                borderLeft: '2px solid var(--color-accent-deep)',
                paddingLeft: '4px',
              }}
            >
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: diff output index is stable for this render
              key={i}
              style={{
                color: 'var(--color-ink-4)',
                textDecoration: 'line-through',
              }}
            >
              {part.value}
            </span>
          );
        }
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: diff output index is stable for this render
          <span key={i} style={{ color: 'var(--color-ink-2)' }}>
            {part.value}
          </span>
        );
      })}
    </div>
  );
}
