/**
 * findSwap: Finds substantively-different swap candidates for a habit template.
 *
 * Strategy (SWAP-02, SWAP-03):
 * - Same domain, different cluster_id (when present), cosine distance > 0.7 from current's clips.
 * - Returns ≤3 ranked candidates sorted by max cosine-distance descending.
 * - Caller supplies the query function (keeps @cited/core free of drizzle/DB deps).
 */

export type SwapCandidate = {
  readonly templateId: string;
  readonly slug: string;
  readonly title: string;
  readonly clusterId: number | null;
  readonly minCosDistance: number;
};

/**
 * Caller-supplied query function.
 * The caller (route handler with DB access) runs the SQL and returns candidates.
 *
 * Recommended SQL (run inside a transaction with hnsw.iterative_scan = strict_order):
 *
 * WITH current_clips AS (
 *   SELECT c.embedding FROM habit_template_clips htc
 *   JOIN clips c ON c.id = htc.clip_id
 *   WHERE htc.habit_template_id = $currentTemplateId
 * )
 * SELECT ht.id, ht.slug, ht.title, ht.cluster_id,
 *        MIN(c.embedding <=> cc.embedding) AS min_cos_distance
 * FROM habit_templates ht
 * JOIN habit_template_clips htc ON htc.habit_template_id = ht.id
 * JOIN clips c ON c.id = htc.clip_id
 * CROSS JOIN current_clips cc
 * WHERE ht.domain = $domain
 *   AND ($CLUSTER_FILTER)   -- see below
 *   AND ht.id <> $currentTemplateId
 * GROUP BY ht.id
 * HAVING MIN(c.embedding <=> cc.embedding) > 0.7
 * ORDER BY min_cos_distance DESC
 * LIMIT $limit;
 *
 * $CLUSTER_FILTER when currentClusterId IS NOT NULL:
 *   "ht.cluster_id IS NOT NULL AND ht.cluster_id <> $currentClusterId"
 *
 * $CLUSTER_FILTER when currentClusterId IS NULL (fallback — cluster assignment not yet computed):
 *   "TRUE"
 */
export type SwapQueryFn = (params: {
  readonly currentTemplateId: string;
  readonly domain: string;
  readonly currentClusterId: number | null;
  readonly limit: number;
}) => Promise<readonly SwapCandidate[]>;

/**
 * Find substantively-different swap candidates for a habit template.
 *
 * - When currentClusterId is non-null: candidates must be in a DIFFERENT cluster (SWAP-02).
 * - When currentClusterId is null: falls back to cosine > 0.7 only (early-MVP before pg_cron runs).
 * - Returns ≤3 results (default limit), sorted by minCosDistance descending (most different first).
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
