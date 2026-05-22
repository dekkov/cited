import type { Domain } from '../interview/schemas';

export type TemplateEmbedding = {
  readonly templateId: string;
  readonly domain: Domain;
  readonly centroid: readonly number[]; // mean of the template's clip embeddings, 1536-dim
};

export type ClusterAssignment = {
  readonly templateId: string;
  readonly clusterId: number | null; // null when centroid is empty/no clips
};

// Seeded PRNG — mulberry32. Seed fixed at 42 for determinism (used only if random tiebreaks
// needed; primary tiebreaks are templateId-based).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cosineDistance(a: readonly number[], b: readonly number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 1;
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Deterministic k-means. k=4 per domain (SWAP-02 default). Seed = 42.
 * - Templates with empty/missing centroid → cluster_id = null (skipped from clustering).
 * - Group remaining templates by domain.
 * - For each domain group with >= k templates:
 *     1. Sort group by templateId (lexicographic ascending) — deterministic ordering.
 *     2. Pick k initial centroids as k evenly-spaced indices: floor(i * (n-1) / (k-1)) for i in 0..k-1.
 *        (If n < k, every template becomes its own cluster; later clusters unfilled.)
 *     3. Iterate up to 20 times:
 *        a. For each template, compute cosineDistance to each of k centroids.
 *        b. Assign to nearest centroid. On equal distance (within 1e-12), pick the centroid whose
 *           seed templateId is lexicographically smaller (deterministic tiebreak).
 *        c. Recompute each centroid as the element-wise mean of its members' centroids.
 *        d. If no assignment changed since previous iteration, break.
 *     4. Emit { templateId, clusterId } for each template in this domain (clusterId ∈ 0..k-1).
 * - For groups with < k templates: assign cluster_id = group-index sequence 0..n-1.
 * - Return ClusterAssignment[] across all templates (null entries preserved).
 */
export function computeClusters(
  templates: readonly TemplateEmbedding[],
  k = 4,
): readonly ClusterAssignment[] {
  const _rng = mulberry32(42); // reserved for any future random fallback; not used in core loop
  const out: ClusterAssignment[] = [];
  const byDomain = new Map<Domain, TemplateEmbedding[]>();

  for (const t of templates) {
    if (!t.centroid || t.centroid.length === 0) {
      out.push({ templateId: t.templateId, clusterId: null });
      continue;
    }
    const arr = byDomain.get(t.domain) ?? [];
    arr.push(t);
    byDomain.set(t.domain, arr);
  }

  for (const [, group] of byDomain) {
    // Deterministic ordering
    const sorted = [...group].sort((a, b) =>
      a.templateId < b.templateId ? -1 : a.templateId > b.templateId ? 1 : 0,
    );
    const n = sorted.length;
    if (n === 0) continue;

    if (n < k) {
      sorted.forEach((t, i) => out.push({ templateId: t.templateId, clusterId: i }));
      continue;
    }

    // Initial centroids: k evenly-spaced indices in the sorted group
    const seedIdx: number[] = [];
    for (let i = 0; i < k; i++) seedIdx.push(Math.floor((i * (n - 1)) / (k - 1)));
    let centroids: number[][] = seedIdx.map((idx) => [...sorted[idx]!.centroid]);
    const seedTemplateIds = seedIdx.map((idx) => sorted[idx]!.templateId);

    let assignments: number[] = new Array(n).fill(-1);
    for (let iter = 0; iter < 20; iter++) {
      // Assign
      const next: number[] = new Array(n);
      for (let i = 0; i < n; i++) {
        let bestC = 0;
        let bestD = Number.POSITIVE_INFINITY;
        for (let c = 0; c < k; c++) {
          const d = cosineDistance(sorted[i]!.centroid, centroids[c]!);
          if (d < bestD - 1e-12) {
            bestD = d;
            bestC = c;
          } else if (Math.abs(d - bestD) <= 1e-12) {
            // Tiebreak: prefer centroid whose seed templateId is lexicographically smaller
            if (seedTemplateIds[c]! < seedTemplateIds[bestC]!) {
              bestC = c;
            }
          }
        }
        next[i] = bestC;
      }

      // Early terminate if unchanged
      let changed = false;
      for (let i = 0; i < n; i++)
        if (next[i] !== assignments[i]) {
          changed = true;
          break;
        }
      assignments = next;
      if (!changed && iter > 0) break;

      // Recompute centroids
      const dim = centroids[0]!.length;
      const sums: number[][] = Array.from({ length: k }, () => new Array(dim).fill(0) as number[]);
      const counts: number[] = new Array<number>(k).fill(0);
      for (let i = 0; i < n; i++) {
        const c = assignments[i]!;
        // biome-ignore lint/style/noNonNullAssertion: counts is sized k; c is always in [0,k)
        (counts as number[])[c] = (counts[c] ?? 0) + 1;
        for (let j = 0; j < dim; j++) {
          const row = sums[c];
          if (row !== undefined) row[j] = (row[j] ?? 0) + (sorted[i]!.centroid[j] ?? 0);
        }
      }
      for (let c = 0; c < k; c++) {
        const cnt = counts[c] ?? 0;
        const row = sums[c];
        if (cnt > 0 && row !== undefined) {
          for (let j = 0; j < dim; j++) row[j] = (row[j] ?? 0) / cnt;
        } else if (row !== undefined) {
          sums[c] = [...(centroids[c] ?? [])]; // keep prior centroid if empty cluster
        }
      }
      centroids = sums;
    }

    for (let i = 0; i < n; i++) {
      out.push({ templateId: sorted[i]!.templateId, clusterId: assignments[i]! });
    }
  }

  return out;
}
