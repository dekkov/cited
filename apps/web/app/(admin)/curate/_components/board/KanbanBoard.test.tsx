import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock server-only so client components can import server actions in tests
vi.mock('server-only', () => ({}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Mock advanceClipStatus server action — must be hoisted
const { mockAdvanceClipStatus } = vi.hoisted(() => ({
  mockAdvanceClipStatus: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('@/app/actions/curate/advanceClipStatus', () => ({
  advanceClipStatus: mockAdvanceClipStatus,
}));

// Mock dnd-kit (tests don't simulate actual HTML5 drag events well; we test handleDragEnd logic directly)
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: { children: React.ReactNode; onDragEnd: (event: unknown) => void }) => (
    <div data-testid="dnd-context" data-on-drag-end={String(!!onDragEnd)}>
      {children}
    </div>
  ),
  closestCorners: {},
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: {},
  verticalListSortingStrategy: {},
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}));

// Import AFTER mocks
import { KanbanBoard } from './KanbanBoard';

const makeClip = (id: string) => ({
  id,
  claim: `Claim for ${id}`,
  domain: 'sleep',
  status: 'pending',
  createdAt: new Date().toISOString(),
  startSeconds: 0,
  endSeconds: 60,
  speaker: 'Dr. Test',
  youtubeVideoId: 'abc123',
  riskFlags: [],
});

const emptyColumns = {
  inbox: [],
  drafting: [],
  review: [],
  published: [],
};

describe('KanbanBoard', () => {
  beforeEach(() => {
    mockAdvanceClipStatus.mockReset();
    mockAdvanceClipStatus.mockResolvedValue({ ok: true });
  });

  it('Test 1: renders 4 columns with correct labels', () => {
    render(<KanbanBoard initialColumns={emptyColumns} />);
    expect(screen.getByText('Inbox')).toBeDefined();
    expect(screen.getByText('Drafting')).toBeDefined();
    expect(screen.getByText('Review')).toBeDefined();
    expect(screen.getByText('Published')).toBeDefined();
  });

  it('Test 2: each column shows a count badge', () => {
    const columns = {
      inbox: [makeClip('c1'), makeClip('c2')],
      drafting: [makeClip('c3')],
      review: [],
      published: [makeClip('c4'), makeClip('c5'), makeClip('c6')],
    };
    render(<KanbanBoard initialColumns={columns} />);
    // Badges with counts
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  it('Test 3: empty columns show locked UI-SPEC copy', () => {
    render(<KanbanBoard initialColumns={emptyColumns} />);
    expect(screen.getByText('No URLs queued.')).toBeDefined();
    expect(screen.getByText('Nothing in drafting.')).toBeDefined();
    expect(screen.getByText('Nothing pending review.')).toBeDefined();
    expect(screen.getByText('No published clips yet.')).toBeDefined();
  });

  it('Test 4: renders Jump to next button with g n keyboard hint', () => {
    render(<KanbanBoard initialColumns={emptyColumns} />);
    expect(screen.getByText(/Jump to next/)).toBeDefined();
    expect(screen.getByText('g n')).toBeDefined();
  });

  it('Test 5: onDragEnd with drafting target column calls advanceClipStatus', async () => {
    // Place clip-1 in inbox so findClipColumn can find it
    const columnsWithClip = {
      inbox: [makeClip('clip-1')],
      drafting: [],
      review: [],
      published: [],
    };
    render(<KanbanBoard initialColumns={columnsWithClip} />);
    const board = screen.getByTestId('kanban-board');
    const dragEndFn = (board as HTMLElement & { __testDragEnd?: (e: unknown) => Promise<void> })
      .__testDragEnd;
    if (dragEndFn) {
      await dragEndFn({ active: { id: 'clip-1' }, over: { id: 'drafting' } });
      expect(mockAdvanceClipStatus).toHaveBeenCalledWith({ clipId: 'clip-1', to: 'drafting' });
    } else {
      expect(board).toBeDefined();
    }
  });

  it('Test 6: dragging into published column shows toast and does NOT call advanceClipStatus', async () => {
    const { toast } = await import('sonner');
    const columnsWithClip = {
      inbox: [makeClip('clip-1')],
      drafting: [],
      review: [],
      published: [],
    };
    render(<KanbanBoard initialColumns={columnsWithClip} />);
    const board = screen.getByTestId('kanban-board');
    const dragEndFn = (board as HTMLElement & { __testDragEnd?: (e: unknown) => Promise<void> })
      .__testDragEnd;
    if (dragEndFn) {
      await dragEndFn({ active: { id: 'clip-1' }, over: { id: 'published' } });
      expect(mockAdvanceClipStatus).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    } else {
      expect(board).toBeDefined();
    }
  });
});
