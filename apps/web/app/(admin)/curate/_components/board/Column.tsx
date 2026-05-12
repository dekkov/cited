'use client';

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ClipCardData } from './ClipCard';
import { ClipCard } from './ClipCard';

export type ColumnId = 'inbox' | 'drafting' | 'review' | 'published';

const EMPTY_STATES: Record<ColumnId, { heading: string; body: string }> = {
  inbox: {
    heading: 'No URLs queued.',
    body: 'Paste a YouTube URL into the ingestion form to start a new clip.',
  },
  drafting: {
    heading: 'Nothing in drafting.',
    body: 'Move an Inbox item here, or pull the next item with g n.',
  },
  review: {
    heading: 'Nothing pending review.',
    body: 'Promote a Drafting item once required metadata is complete.',
  },
  published: {
    heading: 'No published clips yet.',
    body: 'Approved clips appear here. Target: 30 across 4 domains.',
  },
};

type Props = {
  id: ColumnId;
  title: string;
  clips: ClipCardData[];
};

export function Column({ id, title, clips }: Props) {
  const isEmpty = clips.length === 0;
  const emptyState = EMPTY_STATES[id];
  const isPublished = id === 'published';

  return (
    <div className="flex flex-col gap-2 min-w-0 flex-1">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1">
        <h2
          className="text-sm font-semibold"
          style={{
            color: isPublished ? 'var(--color-accent-deep)' : 'var(--color-ink)',
            fontFamily: 'var(--font-geist-sans)',
          }}
        >
          {title}
        </h2>
        {/* Count badge */}
        <span
          className="rounded-full px-1.5 py-0.5 text-[12px] bg-[var(--color-paper-3)] text-[var(--color-ink-3)]"
          style={{ fontFamily: 'var(--font-geist-mono)', lineHeight: 1.4 }}
        >
          {clips.length}
        </span>
      </div>

      {/* Column body */}
      <div className="flex-1 min-h-[200px] flex flex-col gap-2 p-2 rounded-[var(--radius-md)] bg-[var(--color-paper-2)]">
        {isEmpty ? (
          <div className="flex-1 flex flex-col gap-1 justify-center items-start p-4 bg-[var(--color-paper-3)] rounded-[var(--radius-md)]">
            <p className="text-sm font-semibold text-[var(--color-ink-3)] leading-[1.3]">
              {emptyState.heading}
            </p>
            <p className="text-sm text-[var(--color-ink-3)] leading-[1.5]">{emptyState.body}</p>
          </div>
        ) : (
          <SortableContext items={clips.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {clips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
