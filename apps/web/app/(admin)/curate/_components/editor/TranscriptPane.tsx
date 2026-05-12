'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useRef, useState } from 'react';

export type TranscriptWord = {
  text: string;
  start: number; // seconds
  end: number;
};

type Props = {
  words: TranscriptWord[];
  selectionStartIndex: number | null;
  selectionEndIndex: number | null;
  onSelectionChange: (start: number | null, end: number | null) => void;
  onSetStart: (sec: number) => void;
  onSetEnd: (sec: number) => void;
  onTogglePlay?: () => void;
  onNudge: (deltaSec: number) => void;
};

function formatHMS(s: number): string {
  const total = Math.max(0, Math.floor(s));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function TranscriptPane({
  words,
  selectionStartIndex,
  selectionEndIndex,
  onSelectionChange,
  onSetStart,
  onSetEnd,
  onTogglePlay,
  onNudge,
}: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [cursorIndex, setCursorIndex] = useState<number>(0);

  const rowVirtualizer = useVirtualizer({
    count: words.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 80,
  });

  const handleWordClick = useCallback(
    (idx: number, ev: React.MouseEvent | React.KeyboardEvent) => {
      setCursorIndex(idx);
      const shift = 'shiftKey' in ev && ev.shiftKey;
      if (shift && selectionStartIndex !== null) {
        onSelectionChange(Math.min(selectionStartIndex, idx), Math.max(selectionStartIndex, idx));
      } else {
        onSelectionChange(idx, idx);
      }
    },
    [onSelectionChange, selectionStartIndex],
  );

  const handleKeyDown = useCallback(
    (ev: KeyboardEvent) => {
      const w = words[cursorIndex];
      if (!w) return;
      if (ev.key === '[') {
        ev.preventDefault();
        onSetStart(w.start);
      } else if (ev.key === ']') {
        ev.preventDefault();
        onSetEnd(w.end);
      } else if (ev.key === ' ') {
        ev.preventDefault();
        onTogglePlay?.();
      } else if (ev.key === 'ArrowLeft') {
        ev.preventDefault();
        onNudge(-0.5);
      } else if (ev.key === 'ArrowRight') {
        ev.preventDefault();
        onNudge(0.5);
      }
    },
    [cursorIndex, onNudge, onSetEnd, onSetStart, onTogglePlay, words],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const selStart =
    selectionStartIndex !== null && words[selectionStartIndex]
      ? words[selectionStartIndex].start
      : null;
  const selEnd =
    selectionEndIndex !== null && words[selectionEndIndex] ? words[selectionEndIndex].end : null;
  const duration = selStart !== null && selEnd !== null ? Math.max(0, selEnd - selStart) : null;

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-paper)' }}>
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b text-xs"
        style={{
          borderColor: 'var(--color-rule)',
          background: 'var(--color-paper-2)',
          fontFamily: 'var(--font-geist-mono)',
          color: 'var(--color-ink-3)',
        }}
      >
        <div data-testid="selection-chip">
          {selStart !== null && selEnd !== null && duration !== null
            ? `${formatHMS(selStart)} → ${formatHMS(selEnd)} · ${formatHMS(duration)}`
            : 'no selection — click a word to set start, shift+click to extend'}
        </div>
        <input
          aria-label="find a phrase"
          disabled
          title="search lands in 02-05"
          placeholder="find a phrase…"
          className="text-xs px-2 py-1 rounded-sm bg-transparent border opacity-60"
          style={{
            borderColor: 'var(--color-rule)',
            fontFamily: 'var(--font-geist-mono)',
            color: 'var(--color-ink-3)',
          }}
        />
      </div>
      <div
        ref={parentRef}
        className="flex-1 overflow-auto px-4 py-3"
        data-testid="transcript-scroll"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const idx = virtualRow.index;
            const word = words[idx];
            if (!word) return null;
            const selected =
              selectionStartIndex !== null &&
              selectionEndIndex !== null &&
              idx >= selectionStartIndex &&
              idx <= selectionEndIndex;
            return (
              <button
                type="button"
                key={virtualRow.key}
                data-word-index={idx}
                data-selected={selected ? 'true' : 'false'}
                onClick={(e) => handleWordClick(idx, e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleWordClick(idx, e);
                }}
                className="text-left px-1 hover:bg-[var(--color-paper-3)] rounded-sm"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                  fontSize: '14px',
                  fontFamily: 'var(--font-geist-sans)',
                  color: 'var(--color-ink-2)',
                  background: selected ? 'var(--color-accent-soft)' : 'transparent',
                }}
              >
                {word.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
