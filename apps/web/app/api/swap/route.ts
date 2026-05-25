import { getSessionUser } from '@/lib/auth/guards';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  type ClipLookup,
  type NearestChunkQuery,
  type SwapQueryFn,
  findSwap,
  validateCitations,
} from '@cited/core';
import { and, clips, eq, habitTemplateClips, habitTemplates, sql, userHabits } from '@cited/db';
import { z } from 'zod';

const Input = z.object({
  userHabitId: z.string().uuid(),
  reason: z.enum(['too_hard', 'dislike', 'schedule_conflict', 'other']),
  // reasonText intentionally OMITTED — deferred to Phase 4 (subject to AUTH-05c).
});

// SWAP-02: candidates must be substantively different from current (cosine distance gate).
// 0.7 was calibrated for ≥30 diverse approved clips; the MVP seed (12 templates) clusters
// tighter than that, so allow an env override for dev demos. Production keeps the strict default.
const RAW_THRESHOLD = process.env['SWAP_MIN_COS_DISTANCE'];
const SWAP_MIN_COS_DISTANCE =
  RAW_THRESHOLD && !Number.isNaN(Number(RAW_THRESHOLD)) ? Number(RAW_THRESHOLD) : 0.7;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  let parsed: z.infer<typeof Input>;
  try {
    parsed = Input.parse(await req.json());
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const { userHabitId, reason } = parsed;
  const db = getDb();

  // Fetch current habit + template (ownership verified)
  const [habitRow] = await db
    .select({
      habitId: userHabits.id,
      habitTemplateId: userHabits.habitTemplateId,
      templateDomain: habitTemplates.domain,
      templateClusterId: habitTemplates.clusterId,
    })
    .from(userHabits)
    .innerJoin(habitTemplates, eq(userHabits.habitTemplateId, habitTemplates.id))
    .where(and(eq(userHabits.id, userHabitId), eq(userHabits.userId, user.id)))
    .limit(1);

  if (!habitRow) return new Response('Not Found', { status: 404 });

  // Build the swap query function (executes SQL in a transaction with iterative_scan)
  const swapQuery: SwapQueryFn = async (params) => {
    return db.transaction(async (tx) => {
      // Enable HNSW iterative scan for filtered ANN queries (pgvector 0.8+)
      await tx.execute(sql`SET LOCAL hnsw.iterative_scan = strict_order`);

      const clusterFilter =
        params.currentClusterId !== null
          ? sql`AND ht.cluster_id IS NOT NULL AND ht.cluster_id <> ${params.currentClusterId}`
          : sql``;

      type SwapRow = {
        id: string;
        slug: string;
        title: string;
        cluster_id: number | null;
        min_cos_distance: string;
      };

      const rows = await tx.execute<SwapRow>(sql`
        WITH current_clips AS (
          SELECT c.embedding
          FROM habit_template_clips htc
          JOIN clips c ON c.id = htc.clip_id
          WHERE htc.habit_template_id = ${params.currentTemplateId}
            AND c.embedding IS NOT NULL
        )
        SELECT
          ht.id,
          ht.slug,
          ht.title,
          ht.cluster_id,
          MIN(c.embedding <=> cc.embedding) AS min_cos_distance
        FROM habit_templates ht
        JOIN habit_template_clips htc ON htc.habit_template_id = ht.id
        JOIN clips c ON c.id = htc.clip_id
        CROSS JOIN current_clips cc
        WHERE ht.domain::text = ${params.domain}
          ${clusterFilter}
          AND ht.id <> ${params.currentTemplateId}
          AND c.embedding IS NOT NULL
        GROUP BY ht.id
        HAVING MIN(c.embedding <=> cc.embedding) > ${SWAP_MIN_COS_DISTANCE}
        ORDER BY min_cos_distance DESC
        LIMIT ${params.limit}
      `);

      const rowArray: SwapRow[] = Array.isArray(rows)
        ? (rows as SwapRow[])
        : ((rows as unknown as { rows: SwapRow[] }).rows ?? []);

      return rowArray.map((r) => ({
        templateId: r.id,
        slug: r.slug,
        title: r.title,
        clusterId: r.cluster_id,
        minCosDistance: Number(r.min_cos_distance),
      }));
    });
  };

  const swaps = await findSwap(
    swapQuery,
    habitRow.habitTemplateId,
    habitRow.templateDomain,
    habitRow.templateClusterId,
    3,
  );

  // Validate citations for each swap candidate (SWAP-03: must have ≥2 validated citations)
  const clipLookup: ClipLookup = async (clipId) => {
    const [row] = await db
      .select({
        id: clips.id,
        status: clips.status,
        claim: clips.claim,
        removedAt: clips.removedAt,
      })
      .from(clips)
      .where(eq(clips.id, clipId))
      .limit(1);
    if (!row) return null;
    return { id: row.id, status: row.status, claim: row.claim, removedAt: row.removedAt };
  };

  const nearest: NearestChunkQuery = async (vec, clipId) => {
    type SimRow = { similarity: string };
    const results = await db.execute<SimRow>(sql`
      SELECT 1 - (tc.embedding <=> ${JSON.stringify(vec)}::vector) AS similarity
      FROM transcript_chunks tc
      JOIN clips c ON c.id = ${clipId}
      WHERE tc.episode_id = c.episode_id
        AND tc.embedding IS NOT NULL
      ORDER BY tc.embedding <=> ${JSON.stringify(vec)}::vector
      LIMIT 1
    `);
    const arr: SimRow[] = Array.isArray(results)
      ? (results as SimRow[])
      : ((results as unknown as { rows: SimRow[] }).rows ?? []);
    const first = arr[0];
    return first ? Number(first.similarity) : null;
  };

  type ValidatedCandidate = (typeof swaps)[number] & {
    citations: { clipId: string; claim: string; speaker: string }[];
  };
  const validated: ValidatedCandidate[] = [];

  for (const swap of swaps) {
    const clipRows = await db
      .select({
        clipId: clips.id,
        clipClaim: clips.claim,
        clipSpeaker: clips.speaker,
      })
      .from(habitTemplateClips)
      .innerJoin(clips, eq(habitTemplateClips.clipId, clips.id))
      .where(eq(habitTemplateClips.habitTemplateId, swap.templateId));

    const candidateCitations = clipRows.map((cr) => ({
      clipId: cr.clipId,
      claim: cr.clipClaim,
      speaker: cr.clipSpeaker,
    }));

    const result = await validateCitations(candidateCitations, clipLookup, nearest);

    if (result.valid.length >= 2) {
      validated.push({
        ...swap,
        citations: result.valid.map((v) => ({
          clipId: v.clipId,
          claim: v.claim,
          speaker: v.speaker,
        })),
      });
    }
  }

  // Log reason (enum only, no free text) — swap_requests table deferred to Phase 4 (AUTH-05c)
  logger.info(
    {
      userHabitId,
      reason,
      candidatesFound: swaps.length,
      validatedCount: validated.length,
    },
    'swap-request',
  );

  return Response.json({ candidates: validated });
}
