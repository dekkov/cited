import type { ClipRetrievalFilters, RankedClip } from './types';

/**
 * Caller-supplied hybrid query function. The caller (e.g., an app/route handler that
 * imports `@cited/db`) is responsible for the SQL query. `@cited/core` stays drizzle-free.
 *
 * The recommended SQL template to run inside a transaction (caller must SET LOCAL before
 * issuing the query):
 *
 *   SET LOCAL hnsw.iterative_scan = strict_order;
 *   SET LOCAL hnsw.max_scan_tuples = 20000;
 *
 * Then the CTE query (paste into a Drizzle `sql\`...\`` template literal for 03-03/03-06):
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
 * Parameters: $1=domains[], $2=excludeRiskFlags[], $3=excludeClipIds[], $4=embedQuery::vector,
 *             $5=textQuery, $6=limit
 *
 * RRF (Reciprocal Rank Fusion) combines vec_ranked and text_ranked using rrf_score. The
 * CTE filters BEFORE the ANN sort so SET LOCAL hnsw.iterative_scan = strict_order can do
 * its job without over-filtering.
 */
export type HybridQueryFn = (params: {
  readonly embedQuery: number[]; // 1536-dim embedding vector
  readonly textQuery: string;
  readonly filters: ClipRetrievalFilters;
  readonly limit: number;
}) => Promise<readonly RankedClip[]>;

// Test seam: allows unit tests to inject a fake without a real DB.
let queryImpl: HybridQueryFn | null = null;

export function __setHybridQueryImpl(impl: HybridQueryFn | null): void {
  queryImpl = impl;
}

/**
 * Hybrid retrieval: combines pgvector cosine + tsvector full-text search via RRF.
 *
 * The caller supplies a `HybridQueryFn` that executes the actual SQL (including the
 * required `SET LOCAL hnsw.iterative_scan = strict_order` transaction preamble). This
 * keeps `@cited/core` free of drizzle-orm.
 *
 * @param query    - Caller-supplied query function (ignored if test seam is set)
 * @param embedQuery - 1536-dim embedding of the user's query text
 * @param textQuery  - Raw text for tsvector full-text search
 * @param filters    - Metadata filters (domains, excludeRiskFlags, excludeClipIds, speakerStatus)
 * @param limit      - Max results to return (default 5)
 * @returns RankedClip[] sorted by descending similarityScore (RRF-combined)
 */
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
