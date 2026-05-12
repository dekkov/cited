'use client';

import { Button } from '@/components/ui/button';
import { AION10Badge } from './AION10Badge';
import { DiffView } from './DiffView';

type Kind = 'suggest-start-end' | 'refine-claim' | 'propose-alternative';

type Props = {
  kind: Kind;
  timestamp: string; // HH:MM:SS
  similarity: number;
  before: string;
  after: string;
  streaming?: boolean;
  onApply: () => void;
  onDiscard: () => void;
};

export function SuggestionCard({
  kind,
  timestamp,
  similarity,
  before,
  after,
  streaming,
  onApply,
  onDiscard,
}: Props) {
  const mode = kind === 'refine-claim' ? 'word' : 'line';
  return (
    <div
      className="rounded-md border p-4"
      style={{
        background: 'var(--color-paper-2)',
        borderColor: 'var(--color-rule)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className="text-xs uppercase tracking-wider"
          style={{
            fontFamily: 'var(--font-geist-mono)',
            color: 'var(--color-ink-3)',
          }}
        >
          AI SUGGESTION · {timestamp}
        </div>
        <AION10Badge similarity={similarity} />
      </div>
      <DiffView before={before} after={after} mode={mode} />
      <div className="flex items-center justify-between mt-3">
        <Button variant="ghost" onClick={onDiscard} disabled={streaming}>
          Discard
        </Button>
        <Button onClick={onApply} disabled={streaming}>
          {streaming ? 'Streaming…' : 'Apply suggestion'}
        </Button>
      </div>
    </div>
  );
}
