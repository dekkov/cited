---
phase: 03-user-ai-loop-the-demo
plan: 06
type: execute
wave: 3
depends_on: ["03-01", "03-02", "03-04"]
files_modified:
  - packages/core/src/habits/seoPolicy.ts
  - packages/core/src/habits/seoPolicy.test.ts
  - packages/core/src/swap/findSwap.ts
  - packages/core/src/swap/findSwap.test.ts
  - packages/core/src/swap/index.ts
  - apps/web/app/(app)/habits/[id]/page.tsx
  - apps/web/app/(app)/habits/[id]/_components/HabitDetail.tsx
  - apps/web/app/(app)/habits/[id]/_components/SwapPanel.tsx
  - apps/web/app/api/swap/route.ts
  - apps/web/app/actions/accept-swap.ts
  - apps/web/app/h/[slug]/page.tsx
  - apps/web/app/h/[slug]/opengraph-image.tsx
  - apps/web/app/h/[slug]/_components/HabitEditorial.tsx
  - apps/web/app/sitemap.ts
  - apps/web/app/robots.ts
  - apps/web/__tests__/rls-public-habit.spec.ts
  - apps/web/__tests__/youtube-embed-smoke.spec.ts
  - scripts/run-cluster-assignment.ts
  - packages/db/migrations/0010_pg_cron_cluster_assignment.sql
  - .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md
  - CLAUDE.md
autonomous: false
requirements:
  - HAB-04
  - HAB-05
  - SWAP-01
  - SWAP-02
  - SWAP-03
  - SWAP-04
  - PUB-01
  - PUB-02
  - PUB-03
  - PUB-04
  - PUB-05
user_setup: []
must_haves:
  truths:
    - "Authenticated /habits/[id] page renders full claim, named-guest attribution, <YouTubeEmbed> with start/end timestamps, 'Watch on Diary of a CEO' CTA, and a Swap button (HAB-04)"
    - "YouTube embed never disables player chrome (no &controls=0 in params); preserves Watch-on-YouTube affordance (HAB-05)"
    - "POST /api/swap returns a substantively-different alternative: same domain, different cluster_id (when present), cosine >0.7 from current's clips, ≥2 validated citations (SWAP-02, SWAP-03)"
    - "Accept swap replaces user_habits.habit_template_id (SWAP-04)"
    - "Public /h/[slug] page renders rich editorial (claim italic, speaker + credentials + attribution note, episode context, YouTubeEmbed, both CTAs) using ONLY anon DB client; no user-scoped tables joined (PUB-01, PUB-02, PUB-05)"
    - "opengraph-image.tsx file convention exports default Image with size 1200x630, includes habit title + YouTube thumbnail + speaker name on warm-paper bg (PUB-03)"
    - "/sitemap.xml is served via app/sitemap.ts; emits habit_templates excluding seoPolicy.shouldNoIndex(template) (PUB-04)"
    - "seoPolicy.shouldNoIndex returns true if any cited clip has risk_flags overlapping ['supplement','medical_advice','contraindication']"
    - "Playwright RLS test proves anon role cannot read user_habits or transcripts.note (PUB-05)"
    - "CONTEXT.md D-12 amended to reflect opengraph-image.tsx file convention (instead of /api/og/h/[slug])"
    - "Weekly pg_cron scheduled to run cluster assignment script (SWAP-02 long-term)"
  artifacts:
    - path: "apps/web/app/h/[slug]/opengraph-image.tsx"
      provides: "Auto OG image per habit (file convention)"
      contains: "ImageResponse"
    - path: "apps/web/app/sitemap.ts"
      provides: "Dynamic sitemap excluding no-index habits"
      contains: "habit_templates"
    - path: "packages/core/src/habits/seoPolicy.ts"
      provides: "noindex rule for supplement-adjacent clips"
      contains: "shouldNoIndex"
    - path: "apps/web/__tests__/rls-public-habit.spec.ts"
      provides: "PUB-05 RLS proof"
      contains: "user_habits"
  key_links:
    - from: "h/[slug]/page.tsx"
      to: "anon Supabase client"
      via: "createBrowserClient or anon @supabase/ssr server client (no service role)"
      pattern: "anon"
    - from: "/api/swap/route.ts"
      to: "validateCitations + hybridRetrieve"
      via: "reuse Plan 03-02 libs"
      pattern: "validateCitations"
    - from: "opengraph-image.tsx"
      to: "habit_templates + clips lookup"
      via: "anon DB read for slug → youtubeVideoId + speaker"
      pattern: "habit_templates"
---

<objective>
Ship the remaining three demo surfaces: authenticated habit detail page with swap, public `/h/[slug]` rich editorial page with OG image + sitemap + RLS proof, and CONTEXT.md/CLAUDE.md amendments locked in by user decisions.

Purpose: This plan closes the demo loop. The Loom video ends with the user sharing a `/h/[slug]` URL.

Output: Two pages, swap API + accept action, OG image file, sitemap, robots, two libs (seoPolicy, findSwap), RLS Playwright test, YouTubeEmbed smoke test, cluster cron, doc amendments.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/UI-DESIGN.md
@.planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md
@.planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md
@packages/db/src/schema/habit-templates.ts
@packages/db/src/schema/habit-template-clips.ts
@packages/db/src/schema/clips.ts
@packages/db/src/schema/episodes.ts
@packages/db/src/schema/user-habits.ts

<interfaces>
From Plan 03-01:
- `habit_templates.cluster_id` (nullable INT)

From Plan 03-02:
- `hybridRetrieve(query, embedQuery, textQuery, filters, limit)` — reused for swap
- `validateCitations(citations, clipLookup, nearest)` — reused for SWAP-03
- `computeClusters(templates, k=4)` — pure k-means

YouTube embed (from existing dep `@next/third-parties@^16.2.6`):
```tsx
import { YouTubeEmbed } from '@next/third-parties/google';
<YouTubeEmbed videoid={id} params="start=10&end=42" />     // never include controls=0 (HAB-05)
```

Supabase clients (Phase 1):
- `apps/web/lib/supabase/server.ts` (or similar) — `createServerClient` with session cookies (RLS-aware)
- For PUBLIC /h/[slug] pages: use a NEW anon helper that does NOT pass session cookies — RLS treats it as anon role.

Existing /legal/dmca page (Phase 2) — public; CTA "Report this clip" link on /h/[slug] points here.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: seoPolicy lib + findSwap lib + cluster assignment script + pg_cron registration migration</name>
  <read_first>
    - packages/db/src/schema/clips.ts (risk_flags column type/shape)
    - packages/core/src/swap/cluster.ts (computeClusters signature from Plan 03-02)
    - .planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md §"Pattern 5: Substantively-different swap" (SQL + fallback rule) + §"noindex rule"
  </read_first>
  <behavior>
    seoPolicy:
    - Test 1: shouldNoIndex({ risk_flags: ['supplement'] }) → true
    - Test 2: shouldNoIndex({ risk_flags: ['medical_advice'] }) → true
    - Test 3: shouldNoIndex({ risk_flags: ['contraindication'] }) → true
    - Test 4: shouldNoIndex({ risk_flags: [] }) → false
    - Test 5: shouldNoIndex({ risk_flags: ['general'] }) → false

    findSwap (caller-supplied query pattern, like hybridRetrieve):
    - Test 6: When current template has cluster_id=1, query is parameterized with `WHERE cluster_id != 1 AND domain = same`
    - Test 7: When current template has cluster_id=NULL, fallback: only `cosine > 0.7` AND `domain = same` is applied (no cluster filter)
    - Test 8: Returns ≤3 ranked candidates sorted by max cos-distance descending
  </behavior>
  <action>
    1. `packages/core/src/habits/seoPolicy.ts`:

       ```ts
       export const NO_INDEX_RISK_FLAGS: readonly string[] = ['supplement', 'medical_advice', 'contraindication'];

       export function shouldNoIndex(args: { risk_flags: readonly string[] }): boolean {
         return args.risk_flags.some((f) => NO_INDEX_RISK_FLAGS.includes(f));
       }

       /**
        * Aggregate version: a habit_template is no-indexed if ANY of its cited clips matches.
        */
       export function templateShouldNoIndex(citedClips: readonly { risk_flags: readonly string[] }[]): boolean {
         return citedClips.some((c) => shouldNoIndex({ risk_flags: c.risk_flags }));
       }
       ```

       Test file covers behaviors 1–5.

    2. `packages/core/src/swap/findSwap.ts`:

       ```ts
       export type SwapQueryFn = (params: {
         readonly currentTemplateId: string;
         readonly domain: string;
         readonly currentClusterId: number | null;
         readonly limit: number;
       }) => Promise<readonly SwapCandidate[]>;

       export type SwapCandidate = {
         readonly templateId: string;
         readonly slug: string;
         readonly title: string;
         readonly clusterId: number | null;
         readonly minCosDistance: number;
       };

       /**
        * The recommended caller SQL (executed inside a transaction; iterative_scan recommended):
        *
        * WITH current_clips AS (
        *   SELECT c.embedding, c.id FROM habit_template_clips htc
        *   JOIN clips c ON c.id = htc.clip_id WHERE htc.habit_template_id = $1
        * ),
        * current_template AS (
        *   SELECT domain, cluster_id FROM habit_templates WHERE id = $1
        * )
        * SELECT ht.id, ht.slug, ht.title, ht.cluster_id,
        *        min(c.embedding <=> cc.embedding) AS min_cos_distance
        * FROM habit_templates ht
        * JOIN habit_template_clips htc ON htc.habit_template_id = ht.id
        * JOIN clips c ON c.id = htc.clip_id
        * CROSS JOIN current_clips cc
        * WHERE ht.domain = (SELECT domain FROM current_template)
        *   AND ($CLUSTER_FILTER)
        *   AND ht.id <> $1
        * GROUP BY ht.id
        * HAVING min(c.embedding <=> cc.embedding) > 0.7
        * ORDER BY min_cos_distance DESC
        * LIMIT $2;
        *
        * $CLUSTER_FILTER is either:
        *   "ht.cluster_id IS NOT NULL AND ht.cluster_id <> (SELECT cluster_id FROM current_template)"
        * or (fallback when current.cluster_id IS NULL):
        *   "TRUE"
        */
       export async function findSwap(
         query: SwapQueryFn,
         currentTemplateId: string,
         domain: string,
         currentClusterId: number | null,
         limit = 3,
       ): Promise<readonly SwapCandidate[]> {
         return query({ currentTemplateId, domain, currentClusterId, limit });
       }
       ```

       Update `packages/core/src/swap/index.ts` to export findSwap. Tests cover behaviors 6–8 with injected fake query.

    3. `scripts/run-cluster-assignment.ts` — one-off + cron-callable script:

       ```ts
       /**
        * Cluster assignment: fetch all habit_templates, compute centroid per template
        * (mean of its clips' embeddings), run computeClusters with k=4, write cluster_id.
        * Idempotent — safe to run on schedule.
        */
       import { computeClusters } from '@cited/core';
       import { getDb } from '@/lib/db';      // or a script-local Drizzle client
       import { habitTemplates, habitTemplateClips, clips } from '@cited/db/schema';
       import { eq, sql } from 'drizzle-orm';

       export async function runClusterAssignment(): Promise<{ assigned: number }> {
         const db = getDb();
         // For each template, compute centroid = mean(embedding) of its clips
         const rows = await db.execute<{ template_id: string; domain: string; centroid: number[] | null }>(sql`
           SELECT ht.id AS template_id, ht.domain::text AS domain,
                  (SELECT array_agg(avg_val) FROM (
                    SELECT avg(val) AS avg_val FROM (
                      SELECT unnest(c.embedding::float[]) WITH ORDINALITY AS t(val, ord)
                      FROM habit_template_clips htc
                      JOIN clips c ON c.id = htc.clip_id
                      WHERE htc.habit_template_id = ht.id
                    ) flat GROUP BY ord ORDER BY ord
                  ) agg) AS centroid
           FROM habit_templates ht
         `);
         // (NOTE: the centroid aggregation SQL above is one option; alternative is to fetch raw embeddings
         //  into JS and average there. Pick whichever the executor finds cleaner — both deterministic.)

         const templates = rows
           .filter((r) => r.centroid && r.centroid.length > 0)
           .map((r) => ({ templateId: r.template_id, domain: r.domain as any, centroid: r.centroid! }));

         const assignments = computeClusters(templates, 4);
         for (const a of assignments) {
           await db.update(habitTemplates).set({ clusterId: a.clusterId }).where(eq(habitTemplates.id, a.templateId));
         }
         return { assigned: assignments.length };
       }

       if (import.meta.url === `file://${process.argv[1]}`) {
         runClusterAssignment().then((r) => { console.log(r); process.exit(0); });
       }
       ```

    4. Run `runClusterAssignment` once locally to populate cluster_ids for the existing ≥30 clips' templates.

    5. `packages/db/migrations/0010_pg_cron_cluster_assignment.sql`:

       ```sql
       -- Weekly cluster reassignment via pg_cron (PROD only — runs Sundays at 03:00 UTC)
       -- pg_cron is enabled in Supabase by default; we register a job that calls a small SQL
       -- procedure which the application can also trigger via the script (idempotent).
       -- For MVP, the job calls a stored proc shell; the actual k-means runs in the Node script
       -- triggered via Supabase Edge Function or a manual pg_cron HTTP call.
       --
       -- Option A (preferred at MVP): register the cron entry but leave it disabled until Phase 4
       --   when we have the Edge Function in place. Document it as a manual step.

       SELECT cron.schedule(
         'cluster-assignment-weekly',
         '0 3 * * 0',
         $$SELECT net.http_post(
            url := current_setting('app.cluster_assignment_url', true),
            headers := '{"Content-Type": "application/json"}'::jsonb
          )$$
       )
       WHERE NOT EXISTS (
         SELECT 1 FROM cron.job WHERE jobname = 'cluster-assignment-weekly'
       );
       ```

       (If Supabase pg_cron isn't accessible in the dev compose stack, wrap in `DO $$ ... $$` with a graceful skip.)
  </action>
  <verify>
    <automated>pnpm --filter @cited/core test -- seoPolicy &amp;&amp; pnpm --filter @cited/core test -- findSwap &amp;&amp; pnpm tsx scripts/run-cluster-assignment.ts</automated>
  </verify>
  <acceptance_criteria>
    - `test -f packages/core/src/habits/seoPolicy.ts`
    - `test -f packages/core/src/swap/findSwap.ts`
    - `test -f scripts/run-cluster-assignment.ts`
    - `grep -q "NO_INDEX_RISK_FLAGS" packages/core/src/habits/seoPolicy.ts` returns 0
    - `grep -q "cluster_id <> " packages/core/src/swap/findSwap.ts` returns 0 (in JSDoc/SQL block)
    - `grep -q "min_cos_distance" packages/core/src/swap/findSwap.ts` returns 0
    - `pnpm --filter @cited/core test` exits 0
  </acceptance_criteria>
  <done>seoPolicy + findSwap libs tested; cluster_id populated for existing templates; weekly pg_cron registered.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Habit detail page + Swap API + Swap UX panel</name>
  <read_first>
    - .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md D-10 (Claude's discretion on swap UX; recommendation in RESEARCH is slide-in panel)
    - .planning/UI-DESIGN.md §"Swap interstitial" (paper-2 bg, accent border, EQUIVALENT-BENEFIT SWAP eyebrow)
    - .planning/UI-DESIGN.md §"Habit Card" (hero mode 200px player)
    - packages/db/src/schema/habit-templates.ts and habit-template-clips.ts and clips.ts and episodes.ts
    - .planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md §"Pattern 4 + Pattern 5"
  </read_first>
  <behavior>
    - Test 1: GET /habits/[id] for owner renders HabitDetail with full claim, speaker, episode context, YouTubeEmbed with start/end
    - Test 2: YouTubeEmbed params does NOT contain `controls=0` (HAB-05); DOES contain `start=` and `end=`
    - Test 3: POST /api/swap returns up to 3 candidates with ≥2 validated citations each (SWAP-03); domain matches current
    - Test 4: When current template has cluster_id, returned candidates have different cluster_id
    - Test 5: Accept swap replaces user_habits.habit_template_id with the chosen alternative; check_ins/streaks reset is left at status quo (don't carry old data over)
    - Test 6: Reason enum from swap form is logged via pino (no free-text capture in this phase — deferred to Phase 4 subject to AUTH-05c)
  </behavior>
  <action>
    1. `apps/web/app/(app)/habits/[id]/page.tsx` (Server Component): fetch user_habit + habit_template + first habit_template_clip → clip → episode for the owner. Render `<HabitDetail>`.

    2. `_components/HabitDetail.tsx`:
       - Newsreader title
       - Block-quoted claim (italic) with sage opening quote-mark glyph
       - Speaker name + status badge (verified/host) + DOAC episode title + date
       - `<YouTubeEmbed videoid={clip.youtubeVideoId} params={`start=${clip.startSeconds}&end=${clip.endSeconds}`} />` — hero mode (200px). Never include `controls=0` or `autoplay=1`.
       - "Watch on Diary of a CEO" link (external, opens new tab) → `https://www.youtube.com/watch?v=${id}&t=${start}s`
       - Trigger + Tiny action rows
       - Risk-flag banner if `risk_flags` non-empty (per ADMN-05 banner copy from Phase 2)
       - Swap button → opens `<SwapPanel />` (Radix Dialog as slide-in panel from right; on mobile becomes fullscreen)

    3. `_components/SwapPanel.tsx` (D-10 discretion exercised: slide-in panel via Radix Dialog right-side, fullscreen on mobile):
       - Form with reason chips (Too hard / Dislike / Schedule conflict / Other). NO free-text input — reasonText capture is deferred to Phase 4 (subject to AUTH-05c).
       - On submit: POST /api/swap with `{ userHabitId, reason }` → renders returned candidates
       - Each candidate card: title, claim italic, "Use this instead" primary + "Keep current" ghost
       - "Use this instead" → calls `acceptSwapAction({ userHabitId, newTemplateId })` → router.refresh()

    4. `apps/web/app/api/swap/route.ts`:

       ```ts
       import { z } from 'zod';
       import { findSwap, validateCitations, type SwapQueryFn, type NearestChunkQuery } from '@cited/core';
       import { getDb } from '@/lib/db';
       import { getSessionUser } from '@/lib/auth';
       import { sql, eq } from 'drizzle-orm';

       const Input = z.object({
         userHabitId: z.string().uuid(),
         reason: z.enum(['too_hard','dislike','schedule_conflict','other']),
         // reasonText intentionally OMITTED — deferred to Phase 4 (subject to AUTH-05c).
       });

       export async function POST(req: Request) {
         const user = await getSessionUser();
         if (!user) return new Response('Unauthorized', { status: 401 });
         const { userHabitId, reason } = Input.parse(await req.json());
         const db = getDb();

         // Fetch current habit + template
         const habit = await db.query.userHabits.findFirst({
           where: (h, { eq, and }) => and(eq(h.id, userHabitId), eq(h.userId, user.id)),
           with: { habitTemplate: true },  // pseudocode — adjust to real Drizzle relations
         });
         if (!habit) return new Response('NotFound', { status: 404 });

         const swapQuery: SwapQueryFn = async (params) => {
           return db.transaction(async (tx) => {
             await tx.execute(sql`SET LOCAL hnsw.iterative_scan = strict_order`);
             const clusterFilter = params.currentClusterId !== null
               ? sql`AND ht.cluster_id IS NOT NULL AND ht.cluster_id <> ${params.currentClusterId}`
               : sql``;
             const rows = await tx.execute(sql`
               WITH current_clips AS (
                 SELECT c.embedding FROM habit_template_clips htc
                 JOIN clips c ON c.id = htc.clip_id
                 WHERE htc.habit_template_id = ${params.currentTemplateId}
               )
               SELECT ht.id, ht.slug, ht.title, ht.cluster_id,
                      MIN(c.embedding <=> cc.embedding) AS min_cos_distance
               FROM habit_templates ht
               JOIN habit_template_clips htc ON htc.habit_template_id = ht.id
               JOIN clips c ON c.id = htc.clip_id
               CROSS JOIN current_clips cc
               WHERE ht.domain::text = ${params.domain}
                 ${clusterFilter}
                 AND ht.id <> ${params.currentTemplateId}
               GROUP BY ht.id
               HAVING MIN(c.embedding <=> cc.embedding) > 0.7
               ORDER BY min_cos_distance DESC
               LIMIT ${params.limit}
             `);
             return rows.map((r) => ({
               templateId: r.id, slug: r.slug, title: r.title,
               clusterId: r.cluster_id, minCosDistance: Number(r.min_cos_distance),
             }));
           });
         };

         const swaps = await findSwap(
           swapQuery,
           habit.habitTemplateId,
           habit.habitTemplate.domain,
           habit.habitTemplate.clusterId,
           3,
         );

         // Validate citations for each swap candidate (SWAP-03)
         const clipLookup = async (clipId: string) => { /* same as Plan 03-03 */ };
         const nearest: NearestChunkQuery = async (vec, clipId) => { /* same as Plan 03-03 */ };
         const validated = [];
         for (const s of swaps) {
           const citations = await db.query.habitTemplateClips.findMany({
             where: (htc, { eq }) => eq(htc.habitTemplateId, s.templateId),
             with: { clip: true },
           });
           const v = await validateCitations(
             citations.map((c) => ({ clipId: c.clip.id, claim: c.clip.claim, speaker: c.clip.speaker })),
             clipLookup, nearest,
           );
           if (v.valid.length >= 2) validated.push({ ...s, citations: v.valid });
         }

         // Log reason (enum only — no free text) via pino. swap_requests table + reasonText deferred to Phase 4 (AUTH-05c).
         return Response.json({ candidates: validated });
       }
       ```

    5. `apps/web/app/actions/accept-swap.ts`:

       ```ts
       'use server';
       import { z } from 'zod';
       import { userHabits } from '@cited/db/schema';
       import { getDb } from '@/lib/db';
       import { getSessionUser } from '@/lib/auth';
       import { and, eq } from 'drizzle-orm';

       const Input = z.object({ userHabitId: z.string().uuid(), newTemplateId: z.string().uuid() });

       export async function acceptSwapAction(raw: unknown): Promise<void> {
         const input = Input.parse(raw);
         const user = await getSessionUser();
         if (!user) throw new Error('Unauthorized');
         const db = getDb();
         await db.update(userHabits)
           .set({ habitTemplateId: input.newTemplateId, updatedAt: new Date() })
           .where(and(eq(userHabits.id, input.userHabitId), eq(userHabits.userId, user.id)));
       }
       ```

    6. Write unit tests for the route (mocked db) + RTL test for SwapPanel.
  </action>
  <verify>
    <automated>pnpm --filter @cited/web typecheck &amp;&amp; pnpm --filter @cited/web test -- habits</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/app/\(app\)/habits/\[id\]/page.tsx`
    - `test -f apps/web/app/\(app\)/habits/\[id\]/_components/SwapPanel.tsx`
    - `test -f apps/web/app/api/swap/route.ts`
    - `test -f apps/web/app/actions/accept-swap.ts`
    - `grep -q "YouTubeEmbed" apps/web/app/\(app\)/habits/\[id\]/_components/HabitDetail.tsx` returns 0
    - `grep -q "controls=0\|controls = 0" apps/web/app/\(app\)/habits/\[id\]/_components/HabitDetail.tsx` returns 1 (no matches — HAB-05)
    - `grep -q "start=" apps/web/app/\(app\)/habits/\[id\]/_components/HabitDetail.tsx` returns 0
    - `grep -q "validateCitations" apps/web/app/api/swap/route.ts` returns 0
    - `grep -q "findSwap\|cluster_id" apps/web/app/api/swap/route.ts` returns 0
    - `grep -q "habitTemplateId: input.newTemplateId" apps/web/app/actions/accept-swap.ts` returns 0
    - `pnpm --filter @cited/web typecheck` exits 0
  </acceptance_criteria>
  <done>Habit detail with embedded clip + swap flow returning substantively-different alternatives.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Public /h/[slug] page + opengraph-image.tsx + sitemap.ts + robots.ts + RLS Playwright test + YouTubeEmbed smoke test</name>
  <read_first>
    - .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md D-11, D-12
    - .planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md §"Pattern 6: OG image via file convention" + §"RLS smoke test for /h/[slug]"
    - .planning/UI-DESIGN.md (rich editorial styling: Newsreader italic claim, sage opening quote, paper bg)
    - packages/core/src/habits/seoPolicy.ts (templateShouldNoIndex from Task 1)
    - apps/web/lib/supabase/ (check existing anon vs session helpers — must NOT use service-role for /h/[slug])
  </read_first>
  <behavior>
    - Test 1: GET /h/{published-slug} as anon returns 200 with rich editorial HTML; no `user_id` strings, no email-shaped patterns, no `auth.uid()`
    - Test 2: Anon Supabase client `.from('user_habits').select('*')` returns empty array (RLS blocks)
    - Test 3: When habit_template's cited clips include risk_flag='supplement', page has `<meta name="robots" content="noindex">` AND the slug is excluded from /sitemap.xml
    - Test 4: opengraph-image at `/h/{slug}/opengraph-image` returns 200 with `Content-Type: image/png`, size 1200x630
    - Test 5: /sitemap.xml lists all habit_template slugs except no-indexed ones
    - Test 6: YouTubeEmbed smoke test (Playwright): visit /h/{slug}, assert the iframe src contains `start=` AND `end=` AND does NOT contain `controls=0`
  </behavior>
  <action>
    1. Create anon-Supabase helper if missing: `apps/web/lib/supabase/anon.ts`:

       ```ts
       import { createClient } from '@supabase/supabase-js';
       export function getAnonSupabase() {
         return createClient(
           process.env['NEXT_PUBLIC_SUPABASE_URL']!,
           process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
           { auth: { persistSession: false } },
         );
       }
       ```

    2. `apps/web/app/h/[slug]/page.tsx`:

       ```tsx
       import { notFound } from 'next/navigation';
       import { templateShouldNoIndex } from '@cited/core';
       import { HabitEditorial } from './_components/HabitEditorial';

       export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
         const { slug } = await params;
         const tpl = await loadPublicHabit(slug);
         if (!tpl) return {};
         const noindex = templateShouldNoIndex(tpl.citedClips);
         const firstClip = tpl.citedClips[0];
         const youtubeId = firstClip?.youtube_video_id ?? '';
         const startSec = firstClip?.start_seconds ?? 0;
         return {
           title: `${tpl.title} — Cited`,
           description: tpl.firstClaim.slice(0, 160),
           robots: noindex ? { index: false, follow: true } : undefined,
           alternates: { canonical: `https://www.youtube.com/watch?v=${youtubeId}&t=${startSec}s` },
         };
       }

       export default async function PublicHabitPage({ params }: { params: Promise<{ slug: string }> }) {
         const { slug } = await params;
         const tpl = await loadPublicHabit(slug);
         if (!tpl) notFound();
         return <HabitEditorial template={tpl} />;
       }

       async function loadPublicHabit(slug: string) {
         // Use ANON Supabase client. Drizzle is fine ONLY if we use a Postgres connection with `auth.uid()=NULL` and RLS enforced
         // (i.e., not a service-role connection). Simpler: read via PostgREST through @supabase/supabase-js anon client.
         const supa = getAnonSupabase();
         const { data: tpl } = await supa
           .from('habit_templates')
           .select(`
             id, slug, title, description, domain, trigger, tiny_action,
             habit_template_clips:habit_template_clips!inner(
               clip:clips!inner(
                 id, claim, rationale, speaker, speaker_status, risk_flags, start_seconds, end_seconds, youtube_video_id,
                 episode:episodes!inner(title, published_at)
               )
             )
           `)
           .eq('slug', slug)
           .single();
         if (!tpl) return null;
         return {
           ...tpl,
           citedClips: tpl.habit_template_clips.map((x: any) => x.clip),
           firstClaim: tpl.habit_template_clips[0]?.clip?.claim ?? '',
         };
       }
       ```

       **Defensive RULE: This route MUST NOT import `supabaseAdmin` or service-role helpers. Only anon.**

    3. `_components/HabitEditorial.tsx` per D-11:
       - Block-quoted claim (Newsreader italic 17–24px) with sage opening quote-mark glyph
       - Speaker name + credentials + attribution note: "Cited speaker; never implies endorsement of this app."
       - DOAC episode context: episode.title + episode.published_at
       - `<YouTubeEmbed videoid={clip.youtubeVideoId} params={`start=${start}&end=${end}`} />` — hero (200px), no controls=0
       - Trigger + Tiny action
       - Primary CTA: "Watch on Diary of a CEO" → `https://www.youtube.com/watch?v=${id}&t=${start}s`
       - Secondary CTA: "Adopt this habit" — if not logged-in, → /signup?adopt={slug}; if logged-in, server action `adoptPublicHabit(slug)` then redirect to /dashboard
       - Health disclaimer footer (LGL-01 — already-shipped component from Phase 2; import + render)
       - Small "Report this clip" link → `/legal/dmca` (LGL-02 carry-over from CONTEXT.md deferred)
       - JSON-LD structured data via `<script type="application/ld+json">` with schema.org HowTo or Article

    4. `apps/web/app/h/[slug]/opengraph-image.tsx`:

       ```tsx
       import { ImageResponse } from 'next/og';
       import { getAnonSupabase } from '@/lib/supabase/anon';

       export const alt = 'Habit backed by Diary of a CEO';
       export const size = { width: 1200, height: 630 };
       export const contentType = 'image/png';

       export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
         const { slug } = await params;
         const supa = getAnonSupabase();
         const { data: tpl } = await supa
           .from('habit_templates')
           .select(`title, habit_template_clips!inner(clip:clips!inner(speaker, youtube_video_id))`)
           .eq('slug', slug).single();

         const speaker = tpl?.habit_template_clips?.[0]?.clip?.speaker ?? '';
         const youtubeId = tpl?.habit_template_clips?.[0]?.clip?.youtube_video_id ?? '';
         const thumb = youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg` : '';

         return new ImageResponse(
           (
             <div style={{ background: '#F4EFE6', width: '100%', height: '100%', display: 'flex' }}>
               {thumb && <img src={thumb} width={540} height={304} style={{ objectFit: 'cover', alignSelf: 'center', marginLeft: 24 }} />}
               <div style={{ padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                 <div style={{ fontSize: 56, color: '#15161A', lineHeight: 1.1 }}>{tpl?.title ?? 'Cited'}</div>
                 <div style={{ fontSize: 24, color: '#5C5D66', marginTop: 16 }}>{speaker}</div>
               </div>
             </div>
           ),
           { ...size },
         );
       }
       ```

    5. `apps/web/app/sitemap.ts`:

       ```ts
       import type { MetadataRoute } from 'next';
       import { getAnonSupabase } from '@/lib/supabase/anon';
       import { templateShouldNoIndex } from '@cited/core';

       export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
         const supa = getAnonSupabase();
         const { data } = await supa.from('habit_templates').select(`
           slug, updated_at, habit_template_clips!inner(clip:clips!inner(risk_flags))
         `);
         const base = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';
         return (data ?? [])
           .filter((row) => !templateShouldNoIndex(row.habit_template_clips.map((x: any) => x.clip)))
           .map((row) => ({
             url: `${base}/h/${row.slug}`,
             lastModified: row.updated_at,
             changeFrequency: 'weekly' as const,
             priority: 0.5,
           }));
       }
       ```

    6. `apps/web/app/robots.ts`:

       ```ts
       import type { MetadataRoute } from 'next';
       export default function robots(): MetadataRoute.Robots {
         return {
           rules: { userAgent: '*', allow: '/h/', disallow: ['/(app)/', '/api/', '/(admin)/', '/(onboarding)/'] },
           sitemap: `${process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000'}/sitemap.xml`,
         };
       }
       ```

    7. `apps/web/__tests__/rls-public-habit.spec.ts` (Playwright integration test — uses real local DB):

       ```ts
       import { test, expect } from '@playwright/test';
       import { createClient } from '@supabase/supabase-js';

       test('GET /h/[slug] as anon does not leak user data + RLS denies user_habits', async () => {
         const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
         // Seed: assume a fixture user A with a habit + a published habit_template with slug 'test-slug' exists.
         // (Test data setup helper from Phase 2 patterns.)

         const res = await fetch(`${process.env.WEB_URL}/h/test-slug`);
         expect(res.status).toBe(200);
         const html = await res.text();
         expect(html).not.toContain('user_id');
         expect(html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/);

         const { data } = await anon.from('user_habits').select('*').limit(1);
         expect(data).toEqual([]);
       });
       ```

    8. `apps/web/__tests__/youtube-embed-smoke.spec.ts` (Playwright):

       ```ts
       import { test, expect } from '@playwright/test';

       test('habit detail iframe src contains start/end and not controls=0', async ({ page }) => {
         await page.goto(`${process.env.WEB_URL}/h/test-slug`);
         const iframe = await page.locator('iframe').first().getAttribute('src');
         expect(iframe).toMatch(/start=/);
         expect(iframe).toMatch(/end=/);
         expect(iframe).not.toMatch(/controls=0/);
       });
       ```
  </action>
  <verify>
    <automated>pnpm --filter @cited/web typecheck &amp;&amp; pnpm --filter @cited/web exec playwright test rls-public-habit.spec.ts youtube-embed-smoke.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/app/h/\[slug\]/page.tsx`
    - `test -f apps/web/app/h/\[slug\]/opengraph-image.tsx`
    - `test -f apps/web/app/sitemap.ts`
    - `test -f apps/web/app/robots.ts`
    - `test -f apps/web/__tests__/rls-public-habit.spec.ts`
    - `test -f apps/web/__tests__/youtube-embed-smoke.spec.ts`
    - `grep -q "supabaseAdmin\|service-role\|SERVICE_ROLE" apps/web/app/h/\[slug\]/page.tsx` returns 1 (no matches — PUB-05)
    - `grep -q "ImageResponse" apps/web/app/h/\[slug\]/opengraph-image.tsx` returns 0
    - `grep -q "templateShouldNoIndex" apps/web/app/sitemap.ts` returns 0
    - `grep -q "templateShouldNoIndex" apps/web/app/h/\[slug\]/page.tsx` returns 0
    - `grep -q "alternates: { canonical:" apps/web/app/h/\[slug\]/page.tsx` returns 0 (Pitfall 18 — canonical points to YouTube)
    - `grep -q "youtube.com/watch" apps/web/app/h/\[slug\]/page.tsx` returns 0 (canonical references YouTube URL with start timestamp)
    - `pnpm --filter @cited/web typecheck` exits 0
  </acceptance_criteria>
  <done>Public /h/[slug] is rich, anon-only, OG-imaged, sitemap-listed, RLS-proofed via Playwright. Canonical link points to YouTube (Pitfall 18).</done>
</task>

<task type="auto">
  <name>Task 4: Amend CONTEXT.md D-12 + CLAUDE.md AI SDK version (lock user decisions)</name>
  <read_first>
    - .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md (lines around D-12)
    - CLAUDE.md (Vercel AI SDK row in Supporting Libraries table)
  </read_first>
  <action>
    1. Open `.planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md`. Find decision **D-12** (currently: `OG image (/api/og/h/[slug] route handler via @vercel/og): ...`). Replace with:

       ```
       - **D-12 (AMENDED 2026-05-13 per user decision):** OG image via file convention `app/h/[slug]/opengraph-image.tsx` using `next/og` `ImageResponse`. This replaces the earlier route-handler-based OG image proposal. Rationale: Next 16 idiomatic, auto-injected `og:image` meta tag, auto-cached at the edge, sized correctly, fewer lines. Behavior is identical to the user. Content unchanged: habit title + YouTube video thumbnail (fetched at generation time) + speaker name on warm paper palette.
       ```

       Add a short note at the bottom of the `<decisions>` block:
       ```
       ### Decision Amendments
       - 2026-05-13: D-12 updated to the file-convention OG image approach (replaces the earlier route-handler-based proposal) per user lock-in following research recommendation.
       ```

       IMPORTANT: When applying the amendment text above to CONTEXT.md, DELETE any prior occurrences of the literal string `/api/og/h/[slug]` from the original D-12 entry. The amendment must NOT contain that literal string (use the phrase "route-handler-based OG image proposal" instead). The acceptance criterion below greps for zero occurrences after the rewrite.

    2. Open `CLAUDE.md`. This was partially done in Plan 03-01 Task 2 — verify the change took. If the table row still says `Vercel AI SDK 5.x`, fix it now. If already `6.x`, no-op.

    3. If `.planning/STATE.md` tracks decision amendments, append a one-line entry for D-12 amendment.
  </action>
  <verify>
    <automated>grep -q "AMENDED 2026-05-13" .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md &amp;&amp; grep -q "opengraph-image.tsx" .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md &amp;&amp; grep -q "AI SDK.*6\.x\|AI SDK 6" CLAUDE.md</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "AMENDED 2026-05-13" .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md` returns 0
    - `grep -q "opengraph-image.tsx" .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md` returns 0
    - `grep -c "/api/og/h/\\[slug\\]" .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md` returns 0 (after the paraphrase, there must be zero verbatim mentions of the old route path anywhere in the file)
    - `grep -E "AI SDK.*6\.x|Vercel AI SDK.*6" CLAUDE.md` returns 0
  </acceptance_criteria>
  <done>CONTEXT.md D-12 amended; CLAUDE.md AI SDK bumped to 6.x; user decisions locked in writing.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 5: End-to-end demo verification — record the Loom</name>
  <what-built>Authenticated habit detail with YouTubeEmbed + Swap; public /h/[slug] rich editorial + OG image + sitemap + robots + RLS test; CONTEXT.md and CLAUDE.md amendments.</what-built>
  <how-to-verify>
    1. Seed Phase 2's ≥30 approved clips into a fresh local DB; run `pnpm tsx scripts/run-cluster-assignment.ts` (cluster_id populated)
    2. Sign up → complete onboarding (Plan 03-04) → land on /dashboard (Plan 03-05) — full happy path
    3. Click into a habit from the dashboard → /habits/[id] renders:
       - Newsreader title
       - Block-quoted italic claim with sage opening-quote
       - Named credentialed speaker + DOAC episode info
       - `<YouTubeEmbed>` plays the clip with start/end timestamps; player chrome present (Watch on YouTube link visible)
       - "Watch on Diary of a CEO" external CTA opens YouTube at `?t={start}s`
       - "Swap" button visible
    4. Click Swap → panel opens; pick a reason → 1-3 alternative habits shown, each substantively different (different cluster_id where present, claim is meaningfully distinct)
    5. Each alternative shows 2 validated citations (test by inspecting payload in Network tab — `candidates[].citations.length >= 2`)
    6. "Use this instead" → user_habits.habit_template_id is updated; dashboard re-renders with new habit
    7. Copy /h/{slug} for a non-supplement habit → open in incognito (anon):
       - Page renders rich editorial layout
       - `<YouTubeEmbed>` works
       - Both CTAs present
       - View source: no `user_id` strings, no emails, NO `<meta name="robots" content="noindex">`
    8. Visit /sitemap.xml → URLs for habit templates listed (excluding supplement ones)
    9. Visit /robots.txt → /(app)/ and /api/ and /(admin)/ disallowed; /h/ allowed; sitemap pointed
    10. For a habit with supplement risk_flag — verify its /h/[slug] page contains `<meta name="robots" content="noindex">` AND its slug is missing from /sitemap.xml
    11. Verify OG image at /h/{slug}/opengraph-image renders a 1200x630 PNG with title + thumbnail + speaker
    12. Verify `grep -r supabaseAdmin apps/web/app/h/` returns nothing (PUB-05 defense-in-depth)
    13. Run `pnpm --filter @cited/web exec playwright test rls-public-habit.spec.ts youtube-embed-smoke.spec.ts` — both pass
    14. **Record the Loom**: 60-90 second walkthrough — signup → interview → adopt → check-in → swap → share /h/[slug] URL. This is the artifact for Phase 5's DOAC pitch.
  </how-to-verify>
  <resume-signal>Type "approved + loom recorded {url or path}" or describe issues</resume-signal>
  <action>Pause for human verification. Follow the steps in &lt;how-to-verify&gt;; do not proceed until the user responds with the resume-signal.</action>
  <verify>Human confirms each step of &lt;how-to-verify&gt; passes; reports issues otherwise.</verify>
  <done>User types "approved" (or "approved + loom recorded ..." for the Loom step) and Claude resumes execution.</done>
</task>

</tasks>

<verification>
- All tests pass (`pnpm test`)
- Playwright RLS + YouTubeEmbed smoke tests pass
- `pnpm --filter @cited/web typecheck` passes
- /sitemap.xml + /robots.txt return valid responses
- /h/[slug] never leaks user-scoped data (manual + Playwright proven)
- CONTEXT.md D-12 + CLAUDE.md amendments visible in git diff
</verification>

<success_criteria>
The phase 3 Loom demo runs end-to-end. Habit detail uses real YouTube embed; swap returns substantively-different alternatives; public /h/[slug] is rich, OG-imaged, sitemap-listed, RLS-proofed. User decisions on AI SDK v6 + opengraph-image.tsx are documented in CONTEXT.md / CLAUDE.md.
</success_criteria>

<output>
After completion, create `.planning/phases/03-user-ai-loop-the-demo/03-06-SUMMARY.md` listing: detail page route, swap API contract, public page route, OG/sitemap/robots routes, RLS test result, Loom URL, CONTEXT.md and CLAUDE.md amendments.
</output>
