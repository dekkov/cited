import { GROUNDING_THRESHOLD, type NearestChunkQuery, groundingCheck } from '../llm/grounding/similarityCheck';
import type { Citation } from '../interview/schemas';

export type ClipLookup = (clipId: string) => Promise<
  { id: string; status: string; claim: string; removedAt: Date | null } | null
>;

export type CitationDropReason =
  | 'clip_not_found_or_unapproved'
  | `claim_similarity_${string}_below_threshold`;

export type ValidateCitationsResult = {
  readonly valid: readonly Citation[];
  readonly dropped: ReadonlyArray<{ citation: Citation; reason: CitationDropReason }>;
};

/**
 * REC-02: For each model-provided citation, (1) verify the clip exists, is approved, not removed;
 * (2) call groundingCheck (Phase 2, threshold 0.85) on the model's `claim` text against the
 * clip's transcript chunks. Drop on either failure. Caller decides whether to regenerate.
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
