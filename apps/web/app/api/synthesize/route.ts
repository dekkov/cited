import { generateObject } from 'ai';
import { z } from 'zod';
import {
  SynthesisOutputSchema,
  INTERVIEW_VOICE_SPEC,
  validateCitations,
  getAiSdkModel,
  getEmbeddings,
  hybridRetrieve,
  QUESTION_POOL_BY_ID,
} from '@cited/core';
import type {
  SynthesisOutput,
  ClipLookup,
  NearestChunkQuery,
  HabitCandidate,
  Citation,
  HybridQueryFn,
  Domain,
} from '@cited/core';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/guards';
import { interviewRuns, consentRecords, clips, eq, and, sql, inArray } from '@cited/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

const AnswerSchema = z.object({
  questionId: z.string(),
  choiceId: z.string(),
  freeText: z.string().max(500).optional(),
});

const RequestSchema = z.object({
  runId: z.string().uuid(),
  freeFormText: z.string().max(8000),
  answers: z.array(AnswerSchema).min(1),
});

const MAX_REGEN_ATTEMPTS = 1;
const RETRIEVAL_LIMIT = 20;

type HydratedAnswer = {
  questionId: string;
  domain: Domain | 'general';
  question: string;
  choiceLabel: string;
  freeText?: string;
};

function hydrateAnswers(
  answers: z.infer<typeof AnswerSchema>[],
): HydratedAnswer[] {
  const out: HydratedAnswer[] = [];
  for (const a of answers) {
    const q = QUESTION_POOL_BY_ID[a.questionId];
    if (!q) continue;
    const choice = q.choices.find((c) => c.id === a.choiceId);
    if (!choice) continue;
    out.push({
      questionId: q.id,
      domain: q.domain,
      question: q.text,
      choiceLabel: choice.label,
      ...(a.freeText ? { freeText: a.freeText } : {}),
    });
  }
  return out;
}

function buildRetrievalQuery(freeFormText: string, hydrated: HydratedAnswer[]): string {
  const answerLines = hydrated.map((a) => `${a.question} — ${a.choiceLabel}${a.freeText ? ` (${a.freeText})` : ''}`);
  return [freeFormText.trim(), ...answerLines].filter(Boolean).join('\n');
}

export async function POST(req: Request): Promise<Response> {
  try {
    return await handlePost(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[synthesize] unhandled error:', err);
    return Response.json({ error: message }, { status: 500 });
  }
}

async function handlePost(req: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = RequestSchema.parse(await req.json());
  const db = getDb();

  // AION-07: Check ai_free_text consent
  const consentRecord = await db.query.consentRecords.findFirst({
    where: and(
      eq(consentRecords.userId, user.id),
      eq(consentRecords.scope, 'ai_free_text'),
    ),
  });
  const allowFreeText = consentRecord?.granted === true;

  const hydrated = hydrateAnswers(body.answers);
  const sanitized = allowFreeText
    ? hydrated
    : hydrated.map(({ freeText: _f, ...rest }) => rest);
  const aboutYou = allowFreeText ? body.freeFormText : '';

  // ── Retrieval: build a query from answers + free-form text, hybrid-retrieve top clips
  const retrievalQuery = buildRetrievalQuery(aboutYou, sanitized);
  const { embeddings } = await getEmbeddings().embed({ input: [retrievalQuery] });
  const queryEmbedding = embeddings[0]!;

  const hybridQuery: HybridQueryFn = async ({ embedQuery, textQuery, filters, limit }) => {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL hnsw.iterative_scan = strict_order`);
      await tx.execute(sql`SET LOCAL hnsw.max_scan_tuples = 20000`);

      const domains = filters.domains ? [...filters.domains] : null;
      const excludeFlags = filters.excludeRiskFlags ? [...filters.excludeRiskFlags] : ([] as string[]);
      const excludeIds = filters.excludeClipIds ? [...filters.excludeClipIds] : null;

      // Drizzle passes a JS array as a composite/record parameter, not a postgres array.
      // Build ARRAY[$1,$2,...] using sql.join so each element is a bound scalar — the
      // ::text[] / ::uuid[] cast then works correctly.
      const domainsSql =
        domains === null || domains.length === 0
          ? sql`TRUE`
          : sql`domain::text = ANY(ARRAY[${sql.join(domains.map((d) => sql`${d}`), sql`, `)}]::text[])`;

      const excludeFlagsSql =
        excludeFlags.length === 0
          ? sql`FALSE`
          : sql`coalesce(risk_flags, '{}'::text[]) && ARRAY[${sql.join(excludeFlags.map((f) => sql`${f}`), sql`, `)}]::text[]`;

      const excludeIdsSql =
        excludeIds === null || excludeIds.length === 0
          ? sql`TRUE`
          : sql`id <> ALL(ARRAY[${sql.join(excludeIds.map((id) => sql`${id}`), sql`, `)}]::uuid[])`;

      const rows = await tx.execute(sql`
        WITH params AS (SELECT 60::int AS rrf_k, 1.0::float AS vec_w, 1.0::float AS text_w),
        filtered AS (
          SELECT id, embedding, claim, rationale, speaker, domain, risk_flags,
                 to_tsvector('english', coalesce(claim,'') || ' ' || coalesce(rationale,'')) AS fts
          FROM clips
          WHERE status = 'approved'
            AND removed_at IS NULL
            AND (${domainsSql})
            AND NOT (${excludeFlagsSql})
            AND (${excludeIdsSql})
        ),
        vec_ranked AS (
          SELECT id,
                 row_number() OVER (ORDER BY embedding <=> ${JSON.stringify(embedQuery)}::vector) AS rnk_vec,
                 1 - (embedding <=> ${JSON.stringify(embedQuery)}::vector) AS sim_vec
          FROM filtered
          ORDER BY embedding <=> ${JSON.stringify(embedQuery)}::vector
          LIMIT 40
        ),
        text_ranked AS (
          SELECT id,
                 row_number() OVER (ORDER BY ts_rank(fts, plainto_tsquery('english', ${textQuery})) DESC) AS rnk_text
          FROM filtered
          WHERE fts @@ plainto_tsquery('english', ${textQuery})
          LIMIT 40
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

  const ranked = await hybridRetrieve(
    hybridQuery,
    queryEmbedding,
    retrievalQuery,
    { excludeRiskFlags: ['medical_advice', 'supplement', 'contraindication'] },
    RETRIEVAL_LIMIT,
  );
  const retrievedIds = ranked.map((r) => r.clipId);

  // Fetch the retrieved clips' canonical text for the prompt
  const retrievedClips = retrievedIds.length === 0
    ? []
    : await db.query.clips.findMany({
        where: and(
          inArray(clips.id, retrievedIds),
          eq(clips.status, 'approved'),
        ),
      });

  if (retrievedClips.length === 0) {
    // Mark the run as completed (even with 0 candidates) so the recommendations page
    // doesn't see candidatesJson=null and redirect back into the interview loop.
    await db.update(interviewRuns)
      .set({ candidatesJson: [], completedAt: new Date() })
      .where(eq(interviewRuns.id, body.runId));
    return Response.json(
      {
        candidates: [],
        profile: null,
        droppedCitations: [],
        warning: 'No approved clips matched the retrieval query — synthesis skipped.',
      },
      { status: 200 },
    );
  }

  const prompt = buildSynthesisPrompt({
    aboutYou,
    answers: sanitized,
    retrievedClips: retrievedClips.map((c) => ({
      id: c.id,
      claim: c.claim,
      speaker: c.speaker,
      domain: c.domain,
    })),
  });

  // Helpers used by validateCitations
  const clipLookup: ClipLookup = async (clipId: string) => {
    const row = await db.query.clips.findFirst({
      where: eq(clips.id, clipId),
    });
    return row ? { id: row.id, status: row.status, claim: row.claim, removedAt: row.removedAt } : null;
  };

  const nearest: NearestChunkQuery = async (vec, clipId) => {
    const rows = await db.execute(sql`
      SELECT 1 - (embedding <=> ${JSON.stringify(vec)}::vector) AS similarity
      FROM transcript_chunks
      WHERE episode_id = (SELECT episode_id FROM clips WHERE id = ${clipId})
      ORDER BY embedding <=> ${JSON.stringify(vec)}::vector LIMIT 1
    `);
    const row = rows[0];
    return row ? Number(row['similarity']) : null;
  };

  // 1st pass
  let output = await doGenerateSynthesis(prompt);
  let validated = await validateOutput(output, clipLookup, nearest);

  let attempt = 0;
  while (attempt < MAX_REGEN_ATTEMPTS && !validated.allCandidatesOk) {
    const regenPrompt = prompt + '\n\nREGENERATION: Previous output had citation or domain-coverage failures. ' +
      'Output must satisfy: every candidate has ≥2 citations whose claim text matches the retrieved-clip claim ' +
      'by cosine ≥ 0.85; gapDomains must each appear in at least one candidate.';
    output = await doGenerateSynthesis(regenPrompt);
    validated = await validateOutput(output, clipLookup, nearest);
    attempt++;
  }

  const finalCandidates: HabitCandidate[] = validated.candidates
    .filter((c) => c.valid)
    .map((c) => ({ ...c.candidate, citations: c.validCitations as Citation[] }));

  await db.update(interviewRuns)
    .set({
      profileJson: output.profileSummary,
      candidatesJson: finalCandidates,
      completedAt: new Date(),
    })
    .where(eq(interviewRuns.id, body.runId));

  return Response.json({
    candidates: finalCandidates,
    profile: output.profileSummary,
    droppedCitations: validated.allDropped,
  });
}

async function doGenerateSynthesis(prompt: string): Promise<SynthesisOutput> {
  const { object } = await generateObject({
    model: getAiSdkModel('reasoning'),    // AION-08: reasoning tier for synthesis
    system: INTERVIEW_VOICE_SPEC,
    schema: SynthesisOutputSchema,
    prompt,
  });
  return object;
}

function buildSynthesisPrompt(args: {
  aboutYou: string;
  answers: HydratedAnswer[];
  retrievedClips: Array<{ id: string; claim: string; speaker: string; domain: string }>;
}): string {
  const clipsBlock = args.retrievedClips
    .map((c) => `- id: ${c.id} | domain: ${c.domain} | speaker: ${c.speaker} | claim: "${c.claim}"`)
    .join('\n');
  const answersBlock = args.answers
    .map((a) => `- [${a.domain}] ${a.question} → ${a.choiceLabel}${a.freeText ? ` (note: ${a.freeText})` : ''}`)
    .join('\n');
  return [
    'Synthesize 3–5 habit candidates from this onboarding interview.',
    '',
    args.aboutYou ? `USER FREE-FORM ABOUT THEM:\n"""\n${args.aboutYou}\n"""\n` : '',
    'STRUCTURED ANSWERS:',
    answersBlock,
    '',
    'RETRIEVED CLIPS (cite ONLY these clip ids):',
    clipsBlock,
    '',
    'REQUIREMENTS:',
    '- Output must match SynthesisOutputSchema exactly.',
    '- Every candidate has 2–3 citations whose clipId is from the list above.',
    "- The model-quoted claim string in each citation MUST closely paraphrase the listed clip's claim (similarity ≥ 0.85 will be checked post-generation).",
    '- profileSummary.gapDomains lists domains with low coverage in the user\'s answers.',
    '- Every domain in gapDomains must appear in at least one candidate (REC-03).',
    '- Each candidate needs a `trigger` (when/where, implementation-intention) and `tinyAction` (≤80 chars, BJ Fogg minimum).',
  ].join('\n');
}

type ValidatedCandidate = {
  candidate: HabitCandidate;
  validCitations: readonly Citation[];
  dropped: ReadonlyArray<{ citation: Citation; reason: string }>;
  valid: boolean;
};

async function validateOutput(
  output: SynthesisOutput,
  clipLookup: ClipLookup,
  nearest: NearestChunkQuery,
): Promise<{
  candidates: ValidatedCandidate[];
  domainsPresent: Set<string>;
  allCandidatesOk: boolean;
  allDropped: ReadonlyArray<{ citation: Citation; reason: string }>;
}> {
  const gapDomains = output.profileSummary.gapDomains;
  const candidates = await Promise.all(
    output.candidates.map(async (c) => {
      const result = await validateCitations(c.citations, clipLookup, nearest);
      return {
        candidate: c,
        validCitations: result.valid,
        dropped: result.dropped,
        valid: result.valid.length >= 2,
      };
    }),
  );
  const domainsPresent = new Set(candidates.filter((c) => c.valid).map((c) => c.candidate.domain));
  const allCandidatesOk =
    candidates.every((c) => c.valid) && gapDomains.every((d) => domainsPresent.has(d));
  const allDropped = candidates.flatMap((c) => c.dropped);
  return { candidates, domainsPresent, allCandidatesOk, allDropped };
}
