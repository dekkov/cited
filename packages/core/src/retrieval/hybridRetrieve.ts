import type { ClipRetrievalFilters, RankedClip } from './types';

export type HybridQueryFn = (params: {
  readonly embedQuery: number[];      // 1536-dim
  readonly textQuery: string;
  readonly filters: ClipRetrievalFilters;
  readonly limit: number;
}) => Promise<readonly RankedClip[]>;

/**
 * The recommended caller SQL (run inside a transaction; caller is responsible for
 * `SET LOCAL hnsw.iterative_scan = strict_order;` and `SET LOCAL hnsw.max_scan_tuples = 20000;`
 * BEFORE this query). The CTE filters BEFORE the ANN sort so iterative_scan can do its job.
 *
 * WITH params AS (SELECT 60::int AS rrf_k, 1.0::float AS vec_w, 1.0::float AS text_w),
 * filtered AS (
 *   SELECT id, embedding, claim, rationale, speaker, domain, risk_flags,
 *          to_tsvector('english', coalesce(claim,'') || ' ' || coalesce(rationale,'')) AS fts
 *   FROM clips
 *   WHERE status = 'approved'
 *     AND removed_at IS NULL
 *     AND ($1::text[] IS NULL OR domain::text = ANY($1::text[]))
 *     AND NOT (coalesce(risk_flags, '{}'::text[]) && $2::text[])
 *     AND ($3::uuid[] IS NULL OR id <> ALL($3::uuid[]))
 * ),
 * vec_ranked AS (
 *   SELECT id,
 *          row_number() OVER (ORDER BY embedding <=> $4::vector) AS rnk_vec,
 *          1 - (embedding <=> $4::vector) AS sim_vec
 *   FROM filtered
 *   ORDER BY embedding <=> $4::vector
 *   LIMIT 30
 * ),
 * text_ranked AS (
 *   SELECT id,
 *          row_number() OVER (ORDER BY ts_rank(fts, plainto_tsquery('english', $5)) DESC) AS rnk_text
 *   FROM filtered
 *   WHERE fts @@ plainto_tsquery('english', $5)
 *   LIMIT 30
 * ),
 * fused AS (
 *   SELECT f.id,
 *          coalesce(1.0 / ((SELECT rrf_k FROM params) + v.rnk_vec), 0) * (SELECT vec_w FROM params) +
 *          coalesce(1.0 / ((SELECT rrf_k FROM params) + t.rnk_text), 0) * (SELECT text_w FROM params)
 *            AS rrf_score,
 *          coalesce(v.sim_vec, 0) AS sim_vec,
 *          coalesce(1.0 / ((SELECT rrf_k FROM params) + v.rnk_vec), 0) AS vec_score,
 *          coalesce(1.0 / ((SELECT rrf_k FROM params) + t.rnk_text), 0) AS text_score
 *   FROM filtered f
 *   LEFT JOIN vec_ranked v ON v.id = f.id
 *   LEFT JOIN text_ranked t ON t.id = f.id
 *   WHERE v.id IS NOT NULL OR t.id IS NOT NULL
 * )
 * SELECT f.id AS clip_id, f.rrf_score AS similarity_score,
 *        f.vec_score AS vector_score, f.text_score AS text_score,
 *        c.claim, c.speaker, c.domain
 * FROM fused f JOIN clips c ON c.id = f.id
 * ORDER BY rrf_score DESC
 * LIMIT $6;
 *
 * Parameters: $1=domains (text[]), $2=excludeRiskFlags (text[]), $3=excludeClipIds (uuid[]),
 *             $4=embedQuery (vector), $5=textQuery (text), $6=limit (int)
 */

// Test seam: mirrors Phase 2 pattern from similarityCheck.ts
let queryImpl: HybridQueryFn | null = null;

export function __setHybridQueryImpl(impl: HybridQueryFn | null): void {
  queryImpl = impl;
}

export async function hybridRetrieve(
  query: HybridQueryFn,
  embedQuery: number[],
  textQuery: string,
  filters: ClipRetrievalFilters = {},
  limit = 5,
): Promise<readonly RankedClip[]> {
  const fn = queryImpl ?? query;
  const rows = await fn({ embedQuery, textQuery, filters, limit });
  return [...rows].sort((a, b) => b.similarityScore - a.similarityScore);
}
