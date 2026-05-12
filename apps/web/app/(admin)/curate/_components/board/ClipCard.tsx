'use client';

// Use native Intl.RelativeTimeFormat — date-fns not installed at MVP
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RemovalDialog } from '../removal/RemovalDialog';

export type ClipCardData = {
  id: string;
  claim: string;
  domain: string;
  createdAt: string;
  startSeconds: number;
  endSeconds: number;
  speaker: string;
  youtubeVideoId: string;
  riskFlags: string[];
  rationale?: string | null;
  hasAiHistory?: boolean;
};

type Props = {
  clip: ClipCardData;
};

function formatDuration(startSeconds: number, endSeconds: number): string {
  const totalSec = Math.max(0, endSeconds - startSeconds);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ClipCard({ clip }: Props) {
  const router = useRouter();
  const [pinned, setPinned] = useState(false);
  const [removalOpen, setRemovalOpen] = useState(false);

  const relativeTime = (() => {
    try {
      const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
      const diffMs = new Date(clip.createdAt).getTime() - Date.now();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (Math.abs(diffDays) < 1) {
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));
        return rtf.format(diffHours, 'hour');
      }
      return rtf.format(diffDays, 'day');
    } catch {
      return '';
    }
  })();

  const domainLabel = clip.domain.replace('_', '+').replace('_', ' ');

  return (
    <>
      <div
        className="bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-md)] p-4 min-h-[96px] flex flex-col gap-2 relative"
        style={{ cursor: 'grab' }}
      >
        {/* Pin + overflow menu */}
        <div className="absolute top-2 right-2 flex gap-1 items-center">
          <button
            type="button"
            aria-label="Pin clip"
            onClick={() => setPinned((p) => !p)}
            className="text-[var(--color-ink-4)] hover:text-[var(--color-accent)] transition-colors"
          >
            <Pin
              size={14}
              style={pinned ? { fill: 'var(--color-accent)', stroke: 'var(--color-accent)' } : {}}
            />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More options"
                className="text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)] transition-colors"
              >
                <MoreHorizontal size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/curate/editor/${clip.id}`)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setRemovalOpen(true)}
                className="text-[var(--color-warn)]"
              >
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* AI eyebrow */}
        {clip.hasAiHistory && (
          <p
            className="text-xs font-mono text-[var(--color-ink-3)] uppercase"
            style={{ letterSpacing: '0.14em' }}
          >
            [AI SUGGESTED]
          </p>
        )}

        {/* Claim (row 1) */}
        <p className="text-sm font-semibold text-[var(--color-ink)] line-clamp-2 pr-10 leading-[1.3]">
          {clip.claim}
        </p>

        {/* Caption row (row 2) */}
        <div className="flex items-center gap-2 text-xs text-[var(--color-ink-3)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] inline-block" />
            <span>{domainLabel}</span>
          </span>
          <span className="font-mono">{formatDuration(clip.startSeconds, clip.endSeconds)}</span>
          <span>{relativeTime}</span>
        </div>
      </div>

      <RemovalDialog clipId={clip.id} open={removalOpen} onOpenChange={setRemovalOpen} />
    </>
  );
}
