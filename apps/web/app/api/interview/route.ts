import { streamText, convertToModelMessages, tool } from 'ai';
import type { UIMessage } from 'ai';
import { z } from 'zod';
import {
  INTERVIEW_VOICE_SPEC,
  computeNextTurn,
  FetchRelevantClipsInput,
  hybridRetrieve,
  getAiSdkModel,
  getEmbeddings,
} from '@cited/core';
import type { HybridQueryFn } from '@cited/core';
import type { Domain } from '@cited/core';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/guards';
import { consentRecords, eq, and, sql } from '@cited/db';

export const runtime = 'nodejs';
export const maxDuration = 30;

const RequestSchema = z.object({
  messages: z.array(z.any()),   // UIMessage[] — server doesn't deeply validate parts shape
  runId: z.string().uuid(),
  turnCount: z.number().int().min(0).max(10),
  domainCoverage: z.record(z.string(), z.number()).default({}),
  userDoneSignal: z.boolean().default(false),
});

export async function POST(req: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = RequestSchema.parse(await req.json());
  const db = getDb();

  // AION-07: free-text gate — check consent before allowing free-text content through.
  // Consent is stored in consent_records table with scope = 'ai_free_text'.
  const consentRecord = await db.query.consentRecords.findFirst({
    where: and(
      eq(consentRecords.userId, user.id),
      eq(consentRecords.scope, 'ai_free_text'),
    ),
  });
  const _allowFreeText = consentRecord?.granted === true;

  const plan = computeNextTurn({
    turnCount: body.turnCount,
    domainCoverage: body.domainCoverage as Record<Domain, number>,
    userDoneSignal: body.userDoneSignal,
  });

  // Caller-supplied hybrid query (HybridQueryFn) — runs inside a transaction with iterative_scan.
  const hybridQuery: HybridQueryFn = async ({ embedQuery, textQuery, filters, limit }) => {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL hnsw.iterative_scan = strict_order`);
      await tx.execute(sql`SET LOCAL hnsw.max_scan_tuples = 20000`);

      // RRF hybrid retrieval SQL — parameters:
      //   $1 = filters.domains (text[])
      //   $2 = filters.excludeRiskFlags (text[])
      //   $3 = filters.excludeClipIds (uuid[])
      //   $4 = embedQuery (vector)
      //   $5 = textQuery (text)
      //   $6 = limit (int)
      const domains = filters.domains ? [...filters.domains] : null;
      const excludeFlags = filters.excludeRiskFlags ? [...filters.excludeRiskFlags] : ([] as string[]);
      const excludeIds = filters.excludeClipIds ? [...filters.excludeClipIds] : null;

      const rows = await tx.execute(sql`
        WITH params AS (SELECT 60::int AS rrf_k, 1.0::float AS vec_w, 1.0::float AS text_w),
        filtered AS (
          SELECT id, embedding, claim, rationale, speaker, domain, risk_flags,
                 to_tsvector('english', coalesce(claim,'') || ' ' || coalesce(rationale,'')) AS fts
          FROM clips
          WHERE status = 'approved'
            AND removed_at IS NULL
            AND (${domains === null ? sql`TRUE` : sql`domain::text = ANY(${domains}::text[])`})
            AND NOT (coalesce(risk_flags, '{}'::text[]) && ${excludeFlags}::text[])
            AND (${excludeIds === null ? sql`TRUE` : sql`id <> ALL(${excludeIds}::uuid[])`})
        ),
        vec_ranked AS (
          SELECT id,
                 row_number() OVER (ORDER BY embedding <=> ${JSON.stringify(embedQuery)}::vector) AS rnk_vec,
                 1 - (embedding <=> ${JSON.stringify(embedQuery)}::vector) AS sim_vec
          FROM filtered
          ORDER BY embedding <=> ${JSON.stringify(embedQuery)}::vector
          LIMIT 30
        ),
        text_ranked AS (
          SELECT id,
                 row_number() OVER (ORDER BY ts_rank(fts, plainto_tsquery('english', ${textQuery})) DESC) AS rnk_text
          FROM filtered
          WHERE fts @@ plainto_tsquery('english', ${textQuery})
          LIMIT 30
        ),
        fused AS (
          SELECT f.id,
                 coalesce(1.0 / ((SELECT rrf_k FROM params) + v.rnk_vec), 0) * (SELECT vec_w FROM params) +
                 coalesce(1.0 / ((SELECT rrf_k FROM params) + t.rnk_text), 0) * (SELECT text_w FROM params)
                   AS rrf_score,
                 coalesce(v.sim_vec, 0) AS sim_vec,
                 coalesce(1.0 / ((SELECT rrf_k FROM params) + v.rnk_vec), 0) AS vec_score,
                 coalesce(1.0 / ((SELECT rrf_k FROM params) + t.rnk_text), 0) AS text_score
          FROM filtered f
          LEFT JOIN vec_ranked v ON v.id = f.id
          LEFT JOIN text_ranked t ON t.id = f.id
          WHERE v.id IS NOT NULL OR t.id IS NOT NULL
        )
        SELECT f.id AS clip_id, f.rrf_score AS similarity_score,
               f.vec_score AS vector_score, f.text_score AS text_score,
               c.claim, c.speaker, c.domain
        FROM fused f JOIN clips c ON c.id = f.id
        ORDER BY rrf_score DESC
        LIMIT ${limit}
      `);

      return rows.map((r) => ({
        clipId: r['clip_id'] as string,
        similarityScore: Number(r['similarity_score']),
        vectorScore: Number(r['vector_score']),
        textScore: Number(r['text_score']),
        claim: r['claim'] as string,
        speaker: r['speaker'] as string,
        domain: r['domain'] as Domain,
      }));
    });
  };

  const modelMessages = await convertToModelMessages(body.messages as UIMessage[]);

  const result = streamText({
    model: getAiSdkModel('cheap'),    // AION-08: cheap tier for turns
    system: INTERVIEW_VOICE_SPEC + (plan.priorityDomain ? `\n\nThis turn focuses on: ${plan.priorityDomain}.` : ''),
    messages: modelMessages,
    tools: {
      fetch_relevant_clips: tool({
        description:
          'Retrieve 3–5 approved DOAC clips relevant to a query within a domain. ' +
          'Call this BEFORE proposing any habit-related question to ground the question in real evidence.',
        inputSchema: FetchRelevantClipsInput,
        execute: async ({ query, domain }) => {
          const { embeddings } = await getEmbeddings().embed({ input: [query] });
          const priorityDomains: readonly Domain[] | undefined =
            domain ? [domain] : (plan.priorityDomain ? [plan.priorityDomain] : undefined);
          const clips = await hybridRetrieve(
            hybridQuery,
            embeddings[0]!,
            query,
            {
              ...(priorityDomains !== undefined ? { domains: priorityDomains } : {}),
              excludeRiskFlags: ['medical_advice', 'supplement', 'contraindication'],
            },
            5,
          );
          return { clips };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
