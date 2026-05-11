---
phase: 02-curation-tooling-doac-corpus
plan: 05
type: execute
wave: 5
depends_on: ["02-01", "02-02", "02-03", "02-04"]
files_modified:
  - apps/web/app/(admin)/curate/page.tsx
  - apps/web/app/(admin)/curate/ingest/page.tsx
  - apps/web/app/(admin)/curate/_components/board/KanbanBoard.tsx
  - apps/web/app/(admin)/curate/_components/board/Column.tsx
  - apps/web/app/(admin)/curate/_components/board/ClipCard.tsx
  - apps/web/app/(admin)/curate/_components/board/KanbanBoard.test.tsx
  - apps/web/app/(admin)/curate/_components/ingest/IngestionForm.tsx
  - apps/web/app/(admin)/curate/_components/ingest/IngestionForm.test.tsx
  - apps/web/app/(admin)/curate/_components/removal/RemovalDialog.tsx
  - apps/web/app/(admin)/curate/_components/shared/AddPodcastInlineCombobox.tsx
  - apps/web/app/(admin)/curate/_components/shared/KeyboardCheatsheet.tsx
  - apps/web/app/actions/curate/removeClip.ts
  - apps/web/app/actions/curate/removeClip.test.ts
  - apps/web/app/actions/curate/removeEpisodeAndBlacklist.ts
  - apps/web/app/actions/curate/removeEpisodeAndBlacklist.test.ts
  - apps/web/app/actions/curate/advanceClipStatus.ts
  - apps/web/app/actions/curate/boardQueries.ts
  - apps/web/app/api/cron/oembed-check/route.ts
  - apps/web/app/api/cron/oembed-check/route.test.ts
  - packages/db/migrations/0007_phase2_oembed_cron.sql
autonomous: true
requirements: [ADMN-07, ADMN-08, LGL-03]
must_haves:
  truths:
    - "Curator lands on /curate and sees four columns (Inbox / Drafting / Review / Published) with auto-sort by episode published_at + domain coverage gap"
    - "Drag-and-drop between columns advances clip status via advanceClipStatus server action; Review → Published is blocked at the board and must go through the editor (Plan 04)"
    - "POST /api/cron/oembed-check iterates episodes, fetches YouTube oEmbed, increments oembed_404_count, flags source_unavailable after 3 consecutive 404s"
    - "removeEpisodeAndBlacklist inserts episode_blacklist row + sets episodes.availability='removed_from_source' + cascade-soft-deletes linked clips + deletes habit_template_clips entries"
    - "removeClip soft-deletes (sets removed_at + reason) and writes clip_edits action='removed'"
    - "Ingestion form posts to /api/admin/ingest with progress states (Resolving / Fetching / Transcribing / Indexed) and surfaces manual upload on Phase 2 fallback"
    - "pg_cron schedules the oembed-check route at 04:00 UTC daily via net.http_get with Bearer CRON_SECRET"
  artifacts:
    - path: "apps/web/app/(admin)/curate/page.tsx"
      provides: "Board landing page with Kanban + Jump-to-next affordance"
    - path: "apps/web/app/(admin)/curate/_components/board/KanbanBoard.tsx"
      provides: "@dnd-kit/core wired Kanban with 4 columns"
    - path: "apps/web/app/actions/curate/removeEpisodeAndBlacklist.ts"
      provides: "LGL-03 one-click takedown cascade"
    - path: "apps/web/app/api/cron/oembed-check/route.ts"
      provides: "ADMN-08 daily availability handler"
    - path: "packages/db/migrations/0007_phase2_oembed_cron.sql"
      provides: "pg_cron schedule + net.http_get binding"
  key_links:
    - from: "apps/web/app/(admin)/curate/_components/board/KanbanBoard.tsx"
      to: "advanceClipStatus server action"
      via: "onDragEnd dispatches advanceClipStatus(clipId, targetColumn)"
      pattern: "advanceClipStatus"
    - from: "packages/db/migrations/0007_phase2_oembed_cron.sql"
      to: "apps/web/app/api/cron/oembed-check/route.ts"
      via: "cron.schedule + net.http_get to /api/cron/oembed-check with Bearer secret"
      pattern: "cron.schedule.*oembed"
    - from: "apps/web/app/actions/curate/removeEpisodeAndBlacklist.ts"
      to: "episode_blacklist + clips.removed_at + habit_template_clips"
      via: "Transactional cascade: blacklist upsert + clip soft-delete + join-table cleanup"
      pattern: "db.transaction"
---

<objective>
Land the curator operational chrome: Kanban board (GA7 — Inbox/Drafting/Review/Published with auto-sort + drag-to-advance), ingestion form (GA3 — URL paste + manual VTT/SRT upload fallback), one-click episode removal cascade (LGL-03), and the daily YouTube oEmbed availability check (ADMN-08 — pg_cron triggering a Vercel route handler with 3-consecutive-404 flap suppression). The component pieces from Plans 03–04 plug in here; this plan closes the curator-flow loop end-to-end.

Purpose: Make Phase 2 usable — the curator can ingest, hand off to the editor (Plan 04), advance through the board, and remove takedowns without leaving the admin shell.

Output: Board surface + ingestion surface + removal modal + cascade actions + pg_cron migration + oEmbed handler.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-curation-tooling-doac-corpus/02-CONTEXT.md
@.planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md
@.planning/phases/02-curation-tooling-doac-corpus/02-UI-SPEC.md
@packages/db/src/schema/clips.ts
@packages/db/src/schema/episodes.ts
@packages/db/src/schema/episode-blacklist.ts
@packages/db/src/schema/habit-template-clips.ts
@apps/web/app/actions/curate/schemas.ts
@apps/web/app/actions/curate/approveClip.ts
@apps/web/app/api/admin/ingest/route.ts

<interfaces>
From Plan 01:
- episodeBlacklist table (youtube_video_id PK, reason, notes, takedown_ref_url, blacklisted_at)
- clips columns: removedAt, removalReason, removalNotes, takedownRefUrl
- episodes columns: sourceUnavailableAt, oembed404Count

From Plan 03:
- addPodcast server action (used by AddPodcastInlineCombobox)

From Plan 04:
- approveClip handles Review → Published (cannot bypass — risk_flags + embed-on-approve). Board's advanceClipStatus only handles Inbox → Drafting → Review.

UI-SPEC locked picks:
- @dnd-kit/core + @dnd-kit/sortable for kanban
- shadcn dialog for RemovalDialog
- Lucide icons permitted in admin (Pin, Plus, MoreHorizontal, Trash2)

Auto-sort query (one of four columns):
```
SELECT c.*, e.published_at,
  (SELECT 30 - COUNT(*) FROM clips c2
   WHERE c2.status='approved' AND c2.domain = c.domain AND c2.removed_at IS NULL) AS coverage_gap
FROM clips c JOIN episodes e ON e.id = c.episode_id
WHERE <column-specific predicate>
ORDER BY e.published_at DESC NULLS LAST, coverage_gap DESC, c.created_at DESC;
```
Column predicates (field-completeness derived — no new schema column needed):
- inbox: status='pending' AND (rationale IS NULL OR rationale = '') AND cardinality(risk_flags) = 0
- drafting: status='pending' AND (rationale IS NOT NULL AND rationale <> '') AND cardinality(risk_flags) = 0
- review: status='pending' AND cardinality(risk_flags) > 0
- published: status='approved' AND removed_at IS NULL
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: removeClip + removeEpisodeAndBlacklist + advanceClipStatus + boardQueries server actions</name>
  <files>
    apps/web/app/actions/curate/removeClip.ts,
    apps/web/app/actions/curate/removeClip.test.ts,
    apps/web/app/actions/curate/removeEpisodeAndBlacklist.ts,
    apps/web/app/actions/curate/removeEpisodeAndBlacklist.test.ts,
    apps/web/app/actions/curate/advanceClipStatus.ts,
    apps/web/app/actions/curate/boardQueries.ts
  </files>
  <read_first>
    - packages/db/src/schema/clips.ts (status enum + removal columns from Plan 01)
    - packages/db/src/schema/episodes.ts (availability enum + sourceUnavailableAt)
    - packages/db/src/schema/episode-blacklist.ts (Plan 01)
    - packages/db/src/schema/habit-template-clips.ts (cascade target — Phase 1 join table; CONTEXT GA6 Cascade S2 says removing a clip cleans up join rows)
    - apps/web/app/actions/curate/approveClip.ts (server-action transaction + clip_edits pattern to mirror)
    - .planning/phases/02-curation-tooling-doac-corpus/02-CONTEXT.md §"GA6 — DMCA + Admin Removal"
    - .planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md §"Pitfall 12 Removal cascade leaves orphan habits"
  </read_first>
  <behavior>
    removeClip.test.ts:
      - Test 1: removeClip({clipId, reason:'factual-error', notes:'X'}) sets removedAt + removalReason + removalNotes; inserts clip_edits action='removed' with payload {reason, notes, affectedHabitTemplateCount}
      - Test 2: Deletes habit_template_clips rows for this clipId (count returned via .returning())
      - Test 3: reason='dmca' without takedownRefUrl → zod rejection
      - Test 4: Non-curator → forbidden
    removeEpisodeAndBlacklist.test.ts:
      - Test 1: Inserts episode_blacklist row, sets episodes.availability='removed_from_source' + sourceUnavailableAt, cascade-soft-deletes all linked clips with reason='dmca', writes one clip_edits row per affected clip
      - Test 2: Idempotent — re-running with same episode is a no-op for the blacklist row (onConflictDoNothing)
      - Test 3: Non-curator → forbidden
  </behavior>
  <action>
Create `apps/web/app/actions/curate/removeClip.ts`:

```ts
'use server';
import { db } from '@hdiary/db';
import { clips, clipEdits, habitTemplateClips } from '@hdiary/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';

const removeClipSchema = z.object({
  clipId: z.string().uuid(),
  reason: z.enum(['dmca', 'factual-error', 'medical-risk', 'speaker-request', 'other']),
  notes: z.string().optional(),
  takedownRefUrl: z.string().url().optional(),
}).refine((d) => d.reason !== 'dmca' || !!d.takedownRefUrl, {
  message: 'takedownRefUrl is required when reason=dmca',
});

export async function removeClip(input: z.infer<typeof removeClipSchema>) {
  const user = await getSessionUser();
  if (!user || !['curator', 'admin'].includes(user.role)) throw new Error('forbidden');
  const parsed = removeClipSchema.parse(input);

  return await db.transaction(async (tx) => {
    const [clip] = await tx.update(clips)
      .set({
        removedAt: new Date(),
        removalReason: parsed.reason,
        removalNotes: parsed.notes,
        takedownRefUrl: parsed.takedownRefUrl,
        updatedAt: new Date(),
      })
      .where(eq(clips.id, parsed.clipId))
      .returning();
    if (!clip) throw new Error('clip not found');

    // Cascade S2: remove habit_template_clips join rows; Phase 3 will treat missing join as "needs new evidence".
    const affected = await tx.delete(habitTemplateClips)
      .where(eq(habitTemplateClips.clipId, parsed.clipId))
      .returning();

    await tx.insert(clipEdits).values({
      clipId: clip.id,
      actorId: user.id,
      source: 'manual',
      field: 'status',
      action: 'removed',
      payload: {
        reason: parsed.reason,
        notes: parsed.notes ?? null,
        takedownRefUrl: parsed.takedownRefUrl ?? null,
        affectedHabitTemplateCount: affected.length,
      },
    });
    return { clip, affectedHabitTemplates: affected.length };
  });
}
```

Create `apps/web/app/actions/curate/removeEpisodeAndBlacklist.ts`:

```ts
'use server';
import { db } from '@hdiary/db';
import { episodes, clips, clipEdits, episodeBlacklist, habitTemplateClips } from '@hdiary/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';

const schema = z.object({
  episodeId: z.string().uuid(),
  reason: z.enum(['dmca', 'speaker-request', 'medical-risk', 'other']),
  notes: z.string().optional(),
  takedownRefUrl: z.string().url().optional(),
});

export async function removeEpisodeAndBlacklist(input: z.infer<typeof schema>) {
  const user = await getSessionUser();
  if (!user || !['curator', 'admin'].includes(user.role)) throw new Error('forbidden');
  const parsed = schema.parse(input);

  return await db.transaction(async (tx) => {
    const [ep] = await tx.select().from(episodes).where(eq(episodes.id, parsed.episodeId));
    if (!ep) throw new Error('episode not found');

    await tx.insert(episodeBlacklist).values({
      youtubeVideoId: ep.youtubeVideoId,
      reason: parsed.reason,
      notes: parsed.notes,
      takedownRefUrl: parsed.takedownRefUrl,
    }).onConflictDoNothing();

    await tx.update(episodes)
      .set({ availability: 'removed_from_source', sourceUnavailableAt: new Date(), updatedAt: new Date() })
      .where(eq(episodes.id, parsed.episodeId));

    const affectedClips = await tx.update(clips)
      .set({
        removedAt: new Date(),
        removalReason: parsed.reason,
        removalNotes: parsed.notes,
        takedownRefUrl: parsed.takedownRefUrl,
        updatedAt: new Date(),
      })
      .where(eq(clips.episodeId, parsed.episodeId))
      .returning();

    for (const c of affectedClips) {
      const affectedJoins = await tx.delete(habitTemplateClips).where(eq(habitTemplateClips.clipId, c.id)).returning();
      await tx.insert(clipEdits).values({
        clipId: c.id, actorId: user.id, source: 'manual', field: 'status',
        action: 'removed',
        payload: {
          reason: parsed.reason,
          notes: parsed.notes ?? null,
          takedownRefUrl: parsed.takedownRefUrl ?? null,
          cascadedFromEpisodeId: parsed.episodeId,
          affectedHabitTemplateCount: affectedJoins.length,
        },
      });
    }

    return { affectedClipCount: affectedClips.length };
  });
}
```

Create `apps/web/app/actions/curate/advanceClipStatus.ts`:

```ts
'use server';
import { db } from '@hdiary/db';
import { clips, clipEdits } from '@hdiary/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';

// Board columns are field-completeness-derived (see boardQueries). advanceClipStatus only writes an audit
// trail of board-column moves. Review → Published is rejected here — the editor's approveClip enforces
// risk_flags + embed-on-approve.
const schema = z.object({
  clipId: z.string().uuid(),
  to: z.enum(['drafting', 'review']),
});

export async function advanceClipStatus(input: z.infer<typeof schema>) {
  const user = await getSessionUser();
  if (!user || !['curator', 'admin'].includes(user.role)) throw new Error('forbidden');
  const parsed = schema.parse(input);
  const [clip] = await db.select().from(clips).where(eq(clips.id, parsed.clipId));
  if (!clip) throw new Error('clip not found');
  await db.insert(clipEdits).values({
    clipId: clip.id, actorId: user.id, source: 'manual', field: 'board_column',
    action: 'updated',
    payload: { toColumn: parsed.to },
  });
  return { ok: true };
}
```

Create `apps/web/app/actions/curate/boardQueries.ts`:

```ts
'use server';
import { db } from '@hdiary/db';
import { sql } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

export type BoardColumn = 'inbox' | 'drafting' | 'review' | 'published';

const PREDICATES: Record<BoardColumn, string> = {
  inbox:     "c.status='pending' AND (c.rationale IS NULL OR c.rationale = '') AND cardinality(c.risk_flags) = 0",
  drafting:  "c.status='pending' AND (c.rationale IS NOT NULL AND c.rationale <> '') AND cardinality(c.risk_flags) = 0",
  review:    "c.status='pending' AND cardinality(c.risk_flags) > 0",
  published: "c.status='approved' AND c.removed_at IS NULL",
};

export async function getBoardColumn(col: BoardColumn) {
  const user = await getSessionUser();
  if (!user || !['curator', 'admin'].includes(user.role)) throw new Error('forbidden');
  const rows = await db.execute(sql.raw(`
    SELECT c.*, e.published_at,
      (SELECT 30 - COUNT(*) FROM clips c2
        WHERE c2.status='approved' AND c2.domain = c.domain AND c2.removed_at IS NULL) AS coverage_gap
    FROM clips c JOIN episodes e ON e.id = c.episode_id
    WHERE ${PREDICATES[col]}
    ORDER BY e.published_at DESC NULLS LAST, coverage_gap DESC, c.created_at DESC
    LIMIT 50
  `));
  return rows;
}
```

Create the three test files per behavior block. Use the same mocking pattern from Plan 03/04 — vi.mock for `@/lib/auth`, mock `@hdiary/db` operations.
  </action>
  <verify>
    <automated>pnpm --filter web exec vitest run app/actions/curate/removeClip.test.ts app/actions/curate/removeEpisodeAndBlacklist.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "habitTemplateClips" apps/web/app/actions/curate/removeClip.ts` exits 0
    - `grep -q "episodeBlacklist" apps/web/app/actions/curate/removeEpisodeAndBlacklist.ts` exits 0
    - `grep -q "onConflictDoNothing" apps/web/app/actions/curate/removeEpisodeAndBlacklist.ts` exits 0
    - `grep -q "action: 'removed'" apps/web/app/actions/curate/removeClip.ts` exits 0
    - `grep -q "cardinality(c.risk_flags)" apps/web/app/actions/curate/boardQueries.ts` exits 0
    - removeClip and removeEpisodeAndBlacklist test files pass
  </acceptance_criteria>
  <done>Removal cascades + board queries server-side complete.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Kanban board UI + ClipCard + RemovalDialog + AddPodcastInlineCombobox + KeyboardCheatsheet</name>
  <files>
    apps/web/app/(admin)/curate/page.tsx,
    apps/web/app/(admin)/curate/_components/board/KanbanBoard.tsx,
    apps/web/app/(admin)/curate/_components/board/Column.tsx,
    apps/web/app/(admin)/curate/_components/board/ClipCard.tsx,
    apps/web/app/(admin)/curate/_components/board/KanbanBoard.test.tsx,
    apps/web/app/(admin)/curate/_components/removal/RemovalDialog.tsx,
    apps/web/app/(admin)/curate/_components/shared/AddPodcastInlineCombobox.tsx,
    apps/web/app/(admin)/curate/_components/shared/KeyboardCheatsheet.tsx
  </files>
  <read_first>
    - .planning/phases/02-curation-tooling-doac-corpus/02-UI-SPEC.md §"Surface-Specific Layout Contracts" #1 + #5, §"Empty states", §"Destructive confirmations"
    - apps/web/app/(admin)/admin/page.tsx (existing admin shell pattern)
    - apps/web/app/actions/curate/boardQueries.ts (Task 1 data source)
    - apps/web/app/actions/curate/removeClip.ts + removeEpisodeAndBlacklist.ts + advanceClipStatus.ts + addPodcast.ts
  </read_first>
  <behavior>
    KanbanBoard.test.tsx:
      - Test 1: Renders 4 columns with copy "Inbox" / "Drafting" / "Review" / "Published"
      - Test 2: Each column shows a count badge styled per UI-SPEC (12px Geist Mono)
      - Test 3: Each empty column renders the locked UI-SPEC copy (No URLs queued. / Nothing in drafting. / Nothing pending review. / No published clips yet.)
      - Test 4: Renders the "Jump to next ↩" button with `g n` hint
      - Test 5: Invoking the onDragEnd handler with a clip ending in 'drafting' column calls advanceClipStatus
      - Test 6: Dragging a card into the 'published' column shows a toast "Use the editor to approve" and does NOT call any server action
  </behavior>
  <action>
1) `apps/web/app/(admin)/curate/page.tsx` (server component): curator-only gate at top (redirect to /admin if role !== curator|admin). Load four columns via `await Promise.all([getBoardColumn('inbox'), getBoardColumn('drafting'), getBoardColumn('review'), getBoardColumn('published')])`. Pass to `<KanbanBoard initialColumns={...} />`. Page padding `lg` (24px), bg `--color-paper`, H1 "Curation board" in 24px Geist Sans 600.

2) `KanbanBoard.tsx` (client): wraps `<DndContext sensors={[useSensor(PointerSensor), useSensor(KeyboardSensor)]} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>`. Renders 4 `<Column>` in a row, gap `md` (16px). Top-right: button `Jump to next ↩` (14px Geist Sans 500) + 12px Geist Mono `g n` hint. Hotkey via `useEffect` keydown listener for `g` then `n` within 500ms → router.push to /curate/editor/<topDraftingId>. `handleDragEnd`: if target column === 'published' show toast "Use the editor to approve clips (risk_flags + embed-on-approve required)" and abort; else call `advanceClipStatus({clipId, to: targetCol})` then `router.refresh()`.

3) `Column.tsx`: wraps `<SortableContext items={ids}>`. Header row: 16px Geist Sans 600 column title + 12px Geist Mono count badge in `--color-paper-3` rounded pill. Published header text uses `--color-accent-deep`. When `items.length === 0`, render the empty state from UI-SPEC §"Empty states" inside a `--color-paper-3` body with `--radius-md`. Heading 14px Geist Sans 600 + body 14px Geist Sans 400 in `--color-ink-3`.

4) `ClipCard.tsx`: `<div>` surface `--color-paper`, `--radius-md`, 1px `--color-rule`, padding `md`, min-height 96px. Row 1: 14px Geist Sans 600 clip claim truncated to 2 lines (Tailwind `line-clamp-2`). Row 2: 12px caption row — domain pill (sage dot + label) · 12px Geist Mono duration (computed from `M:SS`) · `2d ago` relative time (use `date-fns/formatDistanceToNow` already in deps — verify; if not, plain `Intl.RelativeTimeFormat`). Row 3 (only if clip_edits has any AI rows for this clip — pass `hasAiHistory` prop from server): 12px Geist Mono `[AI SUGGESTED]` eyebrow, tracking 0.14em, `--color-ink-3`. Top-right: Lucide `Pin` icon (toggles pinned via local state stub; sage outline when pinned). DropdownMenu (Lucide `MoreHorizontal`) opens with `Edit` (router push to /curate/editor/<id>) and `Remove` (opens `<RemovalDialog>`).

5) `RemovalDialog.tsx`: Radix Dialog via shadcn. Backdrop `--color-ink/40`. Surface `--color-paper`, `--radius-lg`, max-width 520px, padding `lg`.
   - Title: `Remove this clip?` (16/600)
   - Body 14/400: `Soft-deletes the clip and unlinks it from any habits using it as evidence. Habit records are preserved with evidence_clip_id set to NULL and flagged "needs new evidence". The clip stays in the database for audit.`
   - Reason `<Select>` required, 5 options: dmca / factual-error / medical-risk / speaker-request / other
   - Notes `<Textarea>` optional
   - Takedown reference URL `<Input>` shown only when reason='dmca'
   - Confirm button: `Remove clip` — amber border + ghost fill (Tailwind: `border-[color:var(--color-warn)] text-[color:var(--color-warn)] bg-transparent`)
   - Cancel: ghost `Cancel`
   - On submit, calls `removeClip({clipId, reason, notes, takedownRefUrl})`; on success closes dialog + emits 12px Geist Mono toast `[removed] reason=<reason>` + router.refresh()

6) `AddPodcastInlineCombobox.tsx`: shadcn Combobox with podcasts list. Bottom item `+ Create new podcast…` opens an inline panel: `name` input + `host` input + `trust_tier` select (1–5). On submit calls `addPodcast` server action and selects the newly-created row. Used by IngestionForm in Task 3.

7) `KeyboardCheatsheet.tsx`: Radix Dialog. Trigger: global `?` key listener in admin shell layout. Lists shortcuts in 12px Geist Mono table:
   - `[` — Set clip start at cursor word
   - `]` — Set clip end at cursor word
   - `space` — Play/pause
   - `←/→` — Nudge ±0.5s
   - `g n` — Jump to next Drafting clip
   Use shadcn `<kbd>` styling: `--color-paper-3` bg, `--color-rule` border, 12px Geist Mono.

All colors via CSS variables; type sizes from the 4-size scale (24/16/14/12); no emoji.
  </action>
  <verify>
    <automated>cd /home/king/Hdiary && pnpm --filter web exec vitest run "app/\(admin\)/curate/_components/board"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "DndContext" apps/web/app/\(admin\)/curate/_components/board/KanbanBoard.tsx` exits 0
    - `grep -q "Inbox" apps/web/app/\(admin\)/curate/_components/board/KanbanBoard.tsx` exits 0
    - `grep -q "Jump to next" apps/web/app/\(admin\)/curate/_components/board/KanbanBoard.tsx` exits 0
    - `grep -q "No URLs queued." apps/web/app/\(admin\)/curate/_components/board/Column.tsx` exits 0
    - `grep -q "Nothing pending review." apps/web/app/\(admin\)/curate/_components/board/Column.tsx` exits 0
    - `grep -q "Remove this clip?" apps/web/app/\(admin\)/curate/_components/removal/RemovalDialog.tsx` exits 0
    - `grep -q "addPodcast" apps/web/app/\(admin\)/curate/_components/shared/AddPodcastInlineCombobox.tsx` exits 0
    - KanbanBoard.test.tsx exits 0
  </acceptance_criteria>
  <done>Board renders, drag-advance works, removal dialog ships with locked copy + LGL-03 cascade wired, add-podcast inline UX in place.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Ingestion form with stepped progress + manual-fallback panel</name>
  <files>
    apps/web/app/(admin)/curate/ingest/page.tsx,
    apps/web/app/(admin)/curate/_components/ingest/IngestionForm.tsx,
    apps/web/app/(admin)/curate/_components/ingest/IngestionForm.test.tsx
  </files>
  <read_first>
    - apps/web/app/api/admin/ingest/route.ts (Plan 03 — request/response contract; 422 with "Phase 2 fallback" message triggers manual UI)
    - apps/web/app/(admin)/curate/_components/shared/AddPodcastInlineCombobox.tsx (Task 2 — embed here)
    - .planning/phases/02-curation-tooling-doac-corpus/02-UI-SPEC.md §"Surface-Specific Layout Contracts" #4 + §"Loading / progress states" + §"Error states"
    - .planning/phases/02-curation-tooling-doac-corpus/02-CONTEXT.md §"GA3 — Transcript Ingestion"
  </read_first>
  <behavior>
    IngestionForm.test.tsx:
      - Test 1: Renders URL input with 12px Geist Mono placeholder `https://www.youtube.com/watch?v=…`
      - Test 2: Submit button copy is `Fetch transcript`
      - Test 3: Successful POST → replaces form body with 4 stepped status rows; final row contains "Indexed into corpus"
      - Test 4: 422 with message containing "Phase 2 fallback" → reveals manual upload panel with AddPodcastInlineCombobox + youtubeVideoId input + title input + content textarea + `Upload transcript` button
      - Test 5: Submitting manual panel posts to /api/admin/ingest with `manualTranscript` body
      - Test 6: Invalid URL submission shows error copy: `Couldn't parse a YouTube video ID from that URL.`
  </behavior>
  <action>
1) `apps/web/app/(admin)/curate/ingest/page.tsx`: server component shell with H1 `Ingest source` (24/600). Curator gate. Centered max-width 720px container hosting `<IngestionForm />`.

2) `IngestionForm.tsx` (client):
   - Card surface `--color-paper-2`, `--radius-lg`, padding `lg`.
   - Initial state: URL input (Geist Mono placeholder, Geist Sans entered value). Submit button `Fetch transcript` in 14px Geist Sans 500 with sage primary bg.
   - `react-hook-form` + zod resolver pointed at `ingestUrlSchema` (Plan 03). On submit POST `/api/admin/ingest` with `{url}`.
   - Render a 4-step status block driven by client state machine `state: 'idle' | 'resolving' | 'fetching' | 'transcribing' | 'indexed' | 'manual_fallback' | 'error'`:
     - Step 1: `Resolving video metadata…` → `✓ {episode title}` when response includes title
     - Step 2: `Fetching auto-captions…` → `✓ Captions found ({N} words)` OR `⚠ No captions — manual upload required` (when API returns 422 with "Phase 2 fallback")
     - Step 3 (only when source='deepgram'): `Transcribing — ~2 min` 12px mono `--color-ink-3` with determinate progress bar (sage `--color-accent` fill, `--color-rule` track) — for Phase 2 the API actually short-circuits to manual, but keep the UI hook for Phase 5
     - Step 4: `✓ Indexed into corpus (tsvector + chunks).` 14px Geist Sans 400
   - On `manual_fallback`: render secondary panel below the URL form:
     - `<AddPodcastInlineCombobox>` for podcast selection (returns podcastId)
     - youtubeVideoId text input (11 chars validation)
     - title text input
     - content `<Textarea>` 12px Geist Mono monospaced, accepts VTT/SRT/txt
     - filename text input (e.g., "transcript.vtt")
     - `Upload transcript` button posts to /api/admin/ingest with `{manualTranscript: {podcastId, youtubeVideoId, title, content, filename}}`
   - Error copy from UI-SPEC §"Error states":
     - Invalid URL: `Couldn't parse a YouTube video ID from that URL.` body `Expected formats: youtube.com/watch?v=… · youtu.be/… · youtube.com/shorts/…`
     - Captions + manual both fail: `Transcript fetch failed.` body `Retry, or paste the transcript manually into the override panel.`

3) Test file uses RTL + userEvent. Stub `global.fetch` via `vi.spyOn` to return the various API responses. Mock the inline combobox to a simple select for test simplicity.
  </action>
  <verify>
    <automated>cd /home/king/Hdiary && pnpm --filter web exec vitest run "app/\(admin\)/curate/_components/ingest"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "Fetch transcript" apps/web/app/\(admin\)/curate/_components/ingest/IngestionForm.tsx` exits 0
    - `grep -q "Resolving video metadata" apps/web/app/\(admin\)/curate/_components/ingest/IngestionForm.tsx` exits 0
    - `grep -q "Transcribing — ~2 min" apps/web/app/\(admin\)/curate/_components/ingest/IngestionForm.tsx` exits 0
    - `grep -q "Indexed into corpus" apps/web/app/\(admin\)/curate/_components/ingest/IngestionForm.tsx` exits 0
    - `grep -q "Upload transcript" apps/web/app/\(admin\)/curate/_components/ingest/IngestionForm.tsx` exits 0
    - `grep -q "Couldn't parse a YouTube video ID" apps/web/app/\(admin\)/curate/_components/ingest/IngestionForm.tsx` exits 0
    - All 6 IngestionForm tests pass
  </acceptance_criteria>
  <done>Ingestion form drives the full ingest flow including the manual fallback path.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: oEmbed availability route + pg_cron migration (ADMN-08)</name>
  <files>
    apps/web/app/api/cron/oembed-check/route.ts,
    apps/web/app/api/cron/oembed-check/route.test.ts,
    packages/db/migrations/0007_phase2_oembed_cron.sql
  </files>
  <read_first>
    - packages/db/migrations/0001_extensions_and_rls.sql (extensions provisioning — verify pg_cron + pg_net availability)
    - packages/db/src/schema/episodes.ts (target columns: availability, sourceUnavailableAt, oembed404Count, lastOembedCheckAt)
    - .planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md §"Pattern 6 Daily oEmbed Cron" + §"Pitfall 6 oEmbed cron rate-limits or false-positives"
    - .planning/phases/02-curation-tooling-doac-corpus/02-CONTEXT.md (ADMN-08)
  </read_first>
  <behavior>
    route.test.ts:
      - Test 1: Without `Authorization: Bearer <CRON_SECRET>` header → 401
      - Test 2: With valid Bearer + mocked oEmbed fetch returning 200 → episode's oembed404Count reset to 0, lastOembedCheckAt updated, availability unchanged
      - Test 3: 3 consecutive 404s for same episode → episode availability set to 'removed_from_source' and sourceUnavailableAt set
      - Test 4: 1st and 2nd 404 increment oembed404Count without changing availability (flap suppression)
      - Test 5: Test environment: ignore episodes that already have availability='removed_from_source' (skip re-checking)
  </behavior>
  <action>
Create `apps/web/app/api/cron/oembed-check/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { db } from '@hdiary/db';
import { episodes } from '@hdiary/db/schema';
import { and, eq, ne, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const THRESHOLD = 3;

export let oembedFetchImpl: (url: string) => Promise<Response> = (url) => fetch(url);
export function __setOembedFetchImpl(impl: typeof oembedFetchImpl) { oembedFetchImpl = impl; }

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${process.env['CRON_SECRET']}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rows = await db.select().from(episodes).where(ne(episodes.availability, 'removed_from_source'));
  let flagged = 0;
  let healthy = 0;
  let incremented = 0;

  for (const ep of rows) {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ep.youtubeVideoId}&format=json`;
    let status = 0;
    try {
      const res = await oembedFetchImpl(oembedUrl);
      status = res.status;
    } catch {
      status = 0; // network error treated as 404 for counter
    }

    if (status === 200) {
      await db.update(episodes)
        .set({ oembed404Count: 0, lastOembedCheckAt: new Date(), updatedAt: new Date() })
        .where(eq(episodes.id, ep.id));
      healthy++;
    } else if (status === 404 || status === 0) {
      const newCount = (ep.oembed404Count ?? 0) + 1;
      if (newCount >= THRESHOLD) {
        await db.update(episodes)
          .set({
            availability: 'removed_from_source',
            sourceUnavailableAt: new Date(),
            oembed404Count: newCount,
            lastOembedCheckAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, ep.id));
        flagged++;
      } else {
        await db.update(episodes)
          .set({ oembed404Count: newCount, lastOembedCheckAt: new Date(), updatedAt: new Date() })
          .where(eq(episodes.id, ep.id));
        incremented++;
      }
    } else {
      // 2xx/3xx other than 200, or 5xx — touch lastOembedCheckAt without incrementing
      await db.update(episodes)
        .set({ lastOembedCheckAt: new Date(), updatedAt: new Date() })
        .where(eq(episodes.id, ep.id));
    }
  }

  return NextResponse.json({ checked: rows.length, healthy, incremented, flagged });
}
```

Create `route.test.ts` per behavior block. Use `__setOembedFetchImpl` for mock injection. Mock `@hdiary/db` to return fixture episodes.

Create `packages/db/migrations/0007_phase2_oembed_cron.sql`:

```sql
-- Phase 2 — ADMN-08 oEmbed availability cron
-- Requires Supabase: extensions pg_cron and pg_net enabled (provisioned in Phase 1 / Supabase project).
-- Self-host fallback: skip pg_cron and use Vercel cron (apps/web/vercel.json crons entry).

-- Set the shared secret as a Postgres setting (database admin must run once with the actual value):
--   ALTER DATABASE postgres SET app.cron_secret = '<your-secret>';
-- This avoids hard-coding the secret in the migration.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM cron.unschedule('check-episode-availability') FROM cron.job WHERE jobname='check-episode-availability';
    PERFORM cron.schedule(
      'check-episode-availability',
      '0 4 * * *',
      $cron$
        SELECT net.http_post(
          url := current_setting('app.cron_base_url', true) || '/api/cron/oembed-check',
          headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret'))
        );
      $cron$
    );
  END IF;
END $$;
```

Add a comment block at the end documenting the self-host fallback: edit `apps/web/vercel.json` to register a `crons` array entry calling `/api/cron/oembed-check` at `0 4 * * *` UTC with `Authorization: Bearer ${CRON_SECRET}` — Vercel injects the env var at runtime.
  </action>
  <verify>
    <automated>cd /home/king/Hdiary && pnpm --filter web exec vitest run app/api/cron/oembed-check/route.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "Bearer" apps/web/app/api/cron/oembed-check/route.ts` exits 0
    - `grep -q "THRESHOLD = 3" apps/web/app/api/cron/oembed-check/route.ts` exits 0
    - `grep -q "removed_from_source" apps/web/app/api/cron/oembed-check/route.ts` exits 0
    - `grep -q "cron.schedule" packages/db/migrations/0007_phase2_oembed_cron.sql` exits 0
    - `grep -q "check-episode-availability" packages/db/migrations/0007_phase2_oembed_cron.sql` exits 0
    - `grep -q "app.cron_secret" packages/db/migrations/0007_phase2_oembed_cron.sql` exits 0
    - All 5 route tests pass
  </acceptance_criteria>
  <done>Daily oEmbed check + flap suppression + pg_cron registration complete.</done>
</task>

</tasks>

<verification>
- `pnpm --filter web exec vitest run app/actions/curate/ app/(admin)/curate/_components/ app/api/cron/` exits 0
- `pnpm --filter web exec tsc --noEmit` exits 0
- Manual smoke (post-merge): seed 3 pending clips across the 4 board columns; verify drag from Inbox → Drafting reorders correctly; verify drag onto Published shows toast and does not advance.
- Self-host fallback path documented in `vercel.json` cron entry.
</verification>

<success_criteria>
1. /curate landing shows 4 columns auto-sorted by published_at + coverage_gap.
2. Drag-and-drop between columns advances status via advanceClipStatus; Review → Published blocked at the board.
3. Removal dialog soft-deletes + cascades + writes clip_edits with correct payload.
4. Episode-level removal blacklists + cascade-NULLs habit_template_clips + writes per-clip audit.
5. Ingestion form drives the full happy path AND the Phase 2 manual fallback path.
6. /api/cron/oembed-check requires Bearer auth, increments oembed_404_count, flags after 3 consecutive 404s.
7. pg_cron job 'check-episode-availability' registered at 04:00 UTC daily (when extensions are available).
</success_criteria>

<output>
After completion, create `.planning/phases/02-curation-tooling-doac-corpus/02-05-SUMMARY.md`.
</output>
