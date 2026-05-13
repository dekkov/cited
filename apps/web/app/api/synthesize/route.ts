import { generateObject } from 'ai';
import { z } from 'zod';
import {
  SynthesisOutputSchema,
  INTERVIEW_VOICE_SPEC,
  validateCitations,
  getAiSdkModel,
  getEmbeddings,
} from '@cited/core';
import type { SynthesisOutput, ClipLookup, NearestChunkQuery, HabitCandidate, Citation } from '@cited/core';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/guards';
import { interviewRuns, consentRecords, clips, eq, and, sql, inArray, isNull } from '@cited/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

const StructuredAnswerSchema = z.object({
  turn: z.number(),
  domain: z.enum(['sleep', 'nutrition_gut', 'exercise_longevity', 'mental_health']).optional(),
  question: z.string(),
  choiceLabel: z.string(),
  freeText: z.string().optional(),
});

const RequestSchema = z.object({
  runId: z.string().uuid(),
  structuredAnswers: z.array(StructuredAnswerSchema),
  tellMeMoreFreeText: z.string().max(2000).optional(),
  retrievedClipIds: z.array(z.string().uuid()).min(1),    // clips the interview turns surfaced
});

const MAX_REGEN_ATTEMPTS = 1;

export async function POST(req: Request): Promise<Response> {
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

  // Strip free text on AUTH-05c opt-out
  const sanitizedAnswers = allowFreeText
    ? body.structuredAnswers
    : body.structuredAnswers.map(({ freeText: _freeText, ...rest }) => rest);
  const tellMeMore = allowFreeText ? body.tellMeMoreFreeText : undefined;

  // Fetch the retrieved clips' canonical text for the prompt
  const retrievedClips = await db.query.clips.findMany({
    where: and(
      inArray(clips.id, body.retrievedClipIds),
      eq(clips.status, 'approved'),
      isNull(clips.removedAt),
    ),
  });

  const prompt = buildSynthesisPrompt({
    answers: sanitizedAnswers,
    tellMeMore,
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

  // Regenerate up to MAX_REGEN_ATTEMPTS if validation fails
  let attempt = 0;
  while (attempt < MAX_REGEN_ATTEMPTS && !validated.allCandidatesOk) {
    const regenPrompt = prompt + '\n\nREGENERATION: Previous output had citation or domain-coverage failures. ' +
      'Output must satisfy: every candidate has ≥2 citations whose claim text matches the retrieved-clip claim ' +
      'by cosine ≥ 0.85; gapDomains must each appear in at least one candidate.';
    output = await doGenerateSynthesis(regenPrompt);
    validated = await validateOutput(output, clipLookup, nearest);
    attempt++;
  }

  // Final: drop any still-invalid candidates
  const finalCandidates: HabitCandidate[] = validated.candidates
    .filter((c) => c.valid)
    .map((c) => ({ ...c.candidate, citations: c.validCitations as Citation[] }));

  // Persist to interview_runs
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
    model: getAiSdkModel('reasoning'),    // AION-08: Sonnet for synthesis
    system: INTERVIEW_VOICE_SPEC,
    schema: SynthesisOutputSchema,
    prompt,
  });
  return object;
}

function buildSynthesisPrompt(args: {
  answers: unknown[];
  tellMeMore: string | undefined;
  retrievedClips: Array<{ id: string; claim: string; speaker: string; domain: string }>;
}): string {
  const clipsBlock = args.retrievedClips
    .map((c) => `- id: ${c.id} | domain: ${c.domain} | speaker: ${c.speaker} | claim: "${c.claim}"`)
    .join('\n');
  return [
    'Synthesize 3–5 habit candidates from this interview.',
    '',
    'STRUCTURED ANSWERS:',
    JSON.stringify(args.answers, null, 2),
    '',
    args.tellMeMore ? `USER FREE-TEXT ("anything else to share"):\n${args.tellMeMore}\n` : '',
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
