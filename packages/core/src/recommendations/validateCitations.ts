import type { Citation } from '../interview/schemas';
import {
  GROUNDING_THRESHOLD,
  type NearestChunkQuery,
  groundingCheck,
} from '../llm/grounding/similarityCheck';

/**
 * Caller-supplied clip lookup function. The caller (e.g., a route handler with access to
 * `@cited/db`) queries the database for a clip's status and removal state. `@cited/core`
 * stays drizzle-free.
 */
export type ClipLookup = (
  clipId: string,
) => Promise<{ id: string; status: string; claim: string; removedAt: Date | null } | null>;

export type CitationDropReason =
  | 'clip_not_found_or_unapproved'
  | `claim_similarity_${string}_below_threshold`;

export type ValidateCitationsResult = {
  readonly valid: readonly Citation[];
  readonly dropped: ReadonlyArray<{ citation: Citation; reason: CitationDropReason }>;
};

/**
 * REC-02: For each model-provided citation:
 *   1. Verify the clip exists in the DB, is approved, and has not been removed.
 *   2. Call groundingCheck (Phase 2, GROUNDING_THRESHOLD = 0.85) on the model's `claim`
 *      text against the clip's transcript chunks via the caller-supplied `nearest` query.
 *   3. Drop on either failure with a typed reason.
 *
 * Regeneration policy (if `valid.length < 2`, regenerate once) lives in the Plan 03-03
 * route handler — NOT here. This function is a pure validator.
 *
 * @param citations  - Citations from the LLM synthesis step
 * @param clipLookup - Caller-supplied DB lookup for clip status/removal (no drizzle in core)
 * @param nearest    - Caller-supplied pgvector cosine query for transcript chunk similarity
 * @returns { valid, dropped } — immutable result with reasons for each dropped citation
 */
export async function validateCitations(
  citations: readonly Citation[],
  clipLookup: ClipLookup,
  nearest: NearestChunkQuery,
): Promise<ValidateCitationsResult> {
  const valid: Citation[] = [];
  const dropped: Array<{ citation: Citation; reason: CitationDropReason }> = [];

  for (const c of citations) {
    const row = await clipLookup(c.clipId);
    if (!row || row.status !== 'approved' || row.removedAt !== null) {
      dropped.push({ citation: c, reason: 'clip_not_found_or_unapproved' });
      continue;
    }

    const sim = await groundingCheck(nearest, c.claim, c.clipId);
    if (sim < GROUNDING_THRESHOLD) {
      dropped.push({
        citation: c,
        reason: `claim_similarity_${sim.toFixed(2)}_below_threshold` as CitationDropReason,
      });
      continue;
    }

    valid.push(c);
  }

  return { valid, dropped };
}
