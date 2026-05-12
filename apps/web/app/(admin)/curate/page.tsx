import { getBoardColumn } from '@/app/actions/curate/boardQueries';
import { getSessionUser } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import type { ClipCardData } from './_components/board/ClipCard';
import { KanbanBoard } from './_components/board/KanbanBoard';

export default async function CuratePage() {
  const user = await getSessionUser();
  if (!user || (user.role !== 'curator' && user.role !== 'admin')) {
    redirect('/admin');
  }

  // Fetch all four columns in parallel
  const [inboxRaw, draftingRaw, reviewRaw, publishedRaw] = await Promise.all([
    getBoardColumn('inbox'),
    getBoardColumn('drafting'),
    getBoardColumn('review'),
    getBoardColumn('published'),
  ]);

  // Shape rows to ClipCardData — fields come from the raw SQL SELECT
  function toCardData(rows: unknown): ClipCardData[] {
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id ?? ''),
        claim: String(row.claim ?? ''),
        domain: String(row.domain ?? 'sleep'),
        createdAt: String(row.created_at ?? new Date().toISOString()),
        startSeconds: Number(row.start_seconds ?? 0),
        endSeconds: Number(row.end_seconds ?? 0),
        speaker: String(row.speaker ?? ''),
        youtubeVideoId: String(row.youtube_video_id ?? ''),
        riskFlags: Array.isArray(row.risk_flags) ? (row.risk_flags as string[]) : [],
        rationale: row.rationale != null ? String(row.rationale) : null,
        hasAiHistory: false, // v1 stub — Phase 5 wires AI history lookup
      };
    });
  }

  const initialColumns = {
    inbox: toCardData(inboxRaw),
    drafting: toCardData(draftingRaw),
    review: toCardData(reviewRaw),
    published: toCardData(publishedRaw),
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-[var(--color-paper)] min-h-screen">
      <h1
        className="text-2xl font-semibold text-[var(--color-ink)]"
        style={{ fontFamily: 'var(--font-geist-sans)' }}
      >
        Curation board
      </h1>
      <KanbanBoard initialColumns={initialColumns} />
    </div>
  );
}
