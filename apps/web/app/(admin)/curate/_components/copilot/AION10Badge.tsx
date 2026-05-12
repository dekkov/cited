'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Props = {
  similarity: number;
  threshold?: number;
};

// AION-10: shows only when similarity < threshold (default 0.85). Copy + color per UI-SPEC.
export function AION10Badge({ similarity, threshold = 0.85 }: Props) {
  if (similarity >= threshold) return null;
  const pct = Math.round(similarity * 100);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs"
            style={{ color: 'var(--color-warn)', fontFamily: 'var(--font-geist-sans)' }}
            aria-label={`AION-10 grounding ${pct}%, below 85% threshold`}
          >
            <span aria-hidden="true">⚠</span>
            may be unsupported
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <span style={{ fontFamily: 'var(--font-geist-mono)' }} className="text-xs">
            Grounding cosine {pct}% (below {Math.round(threshold * 100)}% threshold). The AI&apos;s
            quotedSpan does not closely match any chunk of this episode&apos;s transcript — review
            before accepting.
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
