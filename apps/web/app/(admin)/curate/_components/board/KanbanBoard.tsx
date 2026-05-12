'use client';

import { advanceClipStatus } from '@/app/actions/curate/advanceClipStatus';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ClipCardData } from './ClipCard';
import { Column, type ColumnId } from './Column';

export type BoardColumns = {
  inbox: ClipCardData[];
  drafting: ClipCardData[];
  review: ClipCardData[];
  published: ClipCardData[];
};

type Props = {
  initialColumns: BoardColumns;
};

const COLUMN_LABELS: Record<ColumnId, string> = {
  inbox: 'Inbox',
  drafting: 'Drafting',
  review: 'Review',
  published: 'Published',
};

const COLUMN_ORDER: ColumnId[] = ['inbox', 'drafting', 'review', 'published'];

// Detect which column a clip belongs to based on its id
function findClipColumn(columns: BoardColumns, clipId: string): ColumnId | null {
  for (const col of COLUMN_ORDER) {
    if (columns[col].some((c) => c.id === clipId)) return col;
  }
  return null;
}

export function KanbanBoard({ initialColumns }: Props) {
  const router = useRouter();
  const [columns, setColumns] = useState<BoardColumns>(initialColumns);
  const gKeyPressedAt = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // g → n keyboard shortcut for "Jump to next Drafting clip"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'g') {
        gKeyPressedAt.current = Date.now();
        return;
      }
      if (e.key === 'n' && gKeyPressedAt.current !== null) {
        const elapsed = Date.now() - gKeyPressedAt.current;
        gKeyPressedAt.current = null;
        if (elapsed < 500) {
          const topDrafting = columns.drafting[0];
          if (topDrafting) {
            router.push(`/curate/editor/${topDrafting.id}`);
          }
          return;
        }
      }
      gKeyPressedAt.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [columns.drafting, router]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const clipId = String(active.id);
      const targetCol = String(over.id) as ColumnId;

      if (targetCol === 'published') {
        toast.error('Use the editor to approve clips', {
          description: 'risk_flags + embed-on-approve required. Open the clip in the editor.',
        });
        return;
      }

      if (targetCol !== 'drafting' && targetCol !== 'review') return;

      const sourceCol = findClipColumn(columns, clipId);
      if (!sourceCol || sourceCol === targetCol) return;

      // Optimistic update
      setColumns((prev) => {
        const clip = prev[sourceCol].find((c) => c.id === clipId);
        if (!clip) return prev;
        return {
          ...prev,
          [sourceCol]: prev[sourceCol].filter((c) => c.id !== clipId),
          [targetCol]: [...prev[targetCol], clip],
        };
      });

      try {
        await advanceClipStatus({ clipId, to: targetCol as 'drafting' | 'review' });
        router.refresh();
      } catch (err) {
        toast.error('Failed to advance clip', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
        // Rollback
        setColumns(initialColumns);
      }
    },
    [columns, initialColumns, router],
  );

  // Expose drag-end handler for tests via a data attribute on the DOM element
  const boardRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        (node as HTMLDivElement & { __testDragEnd?: typeof handleDragEnd }).__testDragEnd =
          handleDragEnd;
      }
    },
    [handleDragEnd],
  );

  const topDraftingId = columns.drafting[0]?.id;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div ref={boardRef} data-testid="kanban-board" className="flex flex-col gap-4">
        {/* Top bar: Jump to next */}
        <div className="flex justify-end items-center gap-2">
          <button
            type="button"
            onClick={() => topDraftingId && router.push(`/curate/editor/${topDraftingId}`)}
            disabled={!topDraftingId}
            className="text-sm font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)] disabled:opacity-40 flex items-center gap-1.5"
            style={{ fontFamily: 'var(--font-geist-sans)' }}
          >
            Jump to next ↩
          </button>
          <span
            className="text-[12px] text-[var(--color-ink-3)] border border-[var(--color-rule)] rounded px-1 py-0.5"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            g n
          </span>
        </div>

        {/* Kanban columns */}
        <div className="grid grid-cols-4 gap-4">
          {COLUMN_ORDER.map((col) => (
            <Column key={col} id={col} title={COLUMN_LABELS[col]} clips={columns[col]} />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
