import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranscriptPane, type TranscriptWord } from './TranscriptPane';

// Mock @tanstack/react-virtual to render all items directly (no viewport simulation needed)
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (opts: { count: number; estimateSize: () => number }) => ({
    getTotalSize: () => opts.count * opts.estimateSize(),
    getVirtualItems: () =>
      Array.from({ length: opts.count }, (_, i) => ({
        index: i,
        key: i,
        start: i * opts.estimateSize(),
        size: opts.estimateSize(),
      })),
  }),
}));

const WORDS: TranscriptWord[] = [
  { text: 'Sleep', start: 10, end: 10.5 },
  { text: 'quality', start: 10.6, end: 11 },
  { text: 'matters', start: 11.1, end: 11.5 },
  { text: 'a', start: 11.6, end: 11.7 },
  { text: 'lot', start: 11.8, end: 12 },
];

describe('TranscriptPane', () => {
  const mockSelectionChange = vi.fn();
  const mockSetStart = vi.fn();
  const mockSetEnd = vi.fn();
  const mockNudge = vi.fn();
  const mockTogglePlay = vi.fn();

  const defaultProps = {
    words: WORDS,
    selectionStartIndex: null,
    selectionEndIndex: null,
    onSelectionChange: mockSelectionChange,
    onSetStart: mockSetStart,
    onSetEnd: mockSetEnd,
    onNudge: mockNudge,
    onTogglePlay: mockTogglePlay,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('click on a word sets selectionStartIndex; shift+click on a later word sets selectionEndIndex', () => {
    const { rerender } = render(<TranscriptPane {...defaultProps} />);

    // Click first word "Sleep"
    const wordButtons = screen.getAllByRole('button');
    const firstButton = wordButtons[0];
    if (!firstButton) throw new Error('No word buttons rendered');
    fireEvent.click(firstButton);

    // Should call onSelectionChange with (0, 0)
    expect(mockSelectionChange).toHaveBeenCalledWith(0, 0);

    // Simulate parent updating the controlled props after the first click
    rerender(<TranscriptPane {...defaultProps} selectionStartIndex={0} selectionEndIndex={0} />);

    // Shift+click on word index 2 "matters"
    const updatedButtons = screen.getAllByRole('button');
    const thirdButton = updatedButtons[2];
    if (!thirdButton) throw new Error('Not enough word buttons rendered');
    fireEvent.click(thirdButton, { shiftKey: true });
    expect(mockSelectionChange).toHaveBeenLastCalledWith(0, 2);
  });

  it('selection chip shows HH:MM:SS → HH:MM:SS · duration when selection is set', () => {
    render(<TranscriptPane {...defaultProps} selectionStartIndex={0} selectionEndIndex={2} />);

    // selStart=10, selEnd=11.5 => duration=1.5s
    // formatHMS(10) = "00:00:10", formatHMS(11) = "00:00:11", formatHMS(1) = "00:00:01"
    const chip = screen.getByTestId('selection-chip');
    expect(chip.textContent).toMatch(/00:00:10.*00:00:11/);
  });

  it('pressing [ calls onSetStart with current word start; ] calls onSetEnd', () => {
    render(<TranscriptPane {...defaultProps} />);

    // Click word index 1 to set cursor
    const wordButtons = screen.getAllByRole('button');
    const secondButton = wordButtons[1];
    if (!secondButton) throw new Error('Not enough word buttons');
    fireEvent.click(secondButton);

    // Press [
    fireEvent.keyDown(window, { key: '[' });
    expect(mockSetStart).toHaveBeenCalledWith(WORDS[1]?.start);

    // Press ]
    fireEvent.keyDown(window, { key: ']' });
    expect(mockSetEnd).toHaveBeenCalledWith(WORDS[1]?.end);
  });

  it('pressing ArrowLeft calls onNudge(-0.5) and ArrowRight calls onNudge(0.5)', () => {
    render(<TranscriptPane {...defaultProps} />);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(mockNudge).toHaveBeenCalledWith(-0.5);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(mockNudge).toHaveBeenCalledWith(0.5);
  });
});
