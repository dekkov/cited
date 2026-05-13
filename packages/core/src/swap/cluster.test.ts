import { describe, expect, it } from 'vitest';
import {
  type ClusterAssignment,
  type TemplateEmbedding,
  computeClusters,
  cosineDistance,
} from './cluster';

// Helper: create a 1536-dim vector in a specific "direction"
// angle in degrees, maps to a unit vector with x=cos(angle), y=sin(angle), rest=0
function makeVec(angle: number): readonly number[] {
  const rad = (angle * Math.PI) / 180;
  const vec = new Array(1536).fill(0);
  vec[0] = Math.cos(rad);
  vec[1] = Math.sin(rad);
  return vec;
}

// Create a template embedding with a given ID, domain, and angle
function makeTemplate(
  id: string,
  domain: 'sleep' | 'nutrition_gut' | 'exercise_longevity' | 'mental_health',
  angle: number,
): TemplateEmbedding {
  return {
    templateId: id,
    domain,
    centroid: makeVec(angle),
  };
}

describe('cosineDistance', () => {
  it('returns 0 for identical vectors', () => {
    const v = makeVec(45);
    expect(cosineDistance([...v], [...v])).toBeCloseTo(0, 5);
  });

  it('returns 1 for orthogonal vectors', () => {
    // 0 and 90 degrees are orthogonal
    const v1 = makeVec(0);
    const v2 = makeVec(90);
    expect(cosineDistance([...v1], [...v2])).toBeCloseTo(1, 5);
  });

  it('returns 1 for zero-magnitude vectors', () => {
    const zero = new Array(4).fill(0);
    expect(cosineDistance(zero, zero)).toBe(1);
  });
});

describe('computeClusters', () => {
  it('Test 1: templates near same angular direction end up in same cluster', () => {
    // With k=4 and n=8, seed indices are floor([0*7/3, 1*7/3, 2*7/3, 3*7/3])=[0,2,4,7]
    // Sorted by id: a(0°), b(5°), c(90°), d(91°), e(180°), f(181°), g(270°), h(271°)
    // Seed templates: a(0°), c(90°), e(180°), h(271°) at indices 0,2,4,7
    // b(5°) is NOT a seed — after convergence b should cluster with a (both ~0°)
    // d(91°) is NOT a seed — after convergence d should cluster with c (both ~90°)
    const templates: TemplateEmbedding[] = [
      makeTemplate('t-a', 'sleep', 0),
      makeTemplate('t-b', 'sleep', 5),     // close to t-a
      makeTemplate('t-c', 'sleep', 90),
      makeTemplate('t-d', 'sleep', 91),    // close to t-c
      makeTemplate('t-e', 'sleep', 180),
      makeTemplate('t-f', 'sleep', 181),   // close to t-e
      makeTemplate('t-g', 'sleep', 270),
      makeTemplate('t-h', 'sleep', 271),   // close to t-g
    ];

    const result = computeClusters(templates, 4);

    const byId = Object.fromEntries(result.map((r) => [r.templateId, r.clusterId]));

    // Close pairs should be in the same cluster
    expect(byId['t-a']).toBe(byId['t-b']); // 0° and 5° → same cluster
    expect(byId['t-c']).toBe(byId['t-d']); // 90° and 91° → same cluster
    expect(byId['t-e']).toBe(byId['t-f']); // 180° and 181° → same cluster
    expect(byId['t-g']).toBe(byId['t-h']); // 270° and 271° → same cluster

    // Different poles should be in different clusters
    expect(byId['t-a']).not.toBe(byId['t-c']);
    expect(byId['t-c']).not.toBe(byId['t-e']);
    expect(byId['t-e']).not.toBe(byId['t-g']);
  });

  it('Test 2: k=4 per domain → clusterId is in range [0, 3] for each template', () => {
    const templates: TemplateEmbedding[] = [
      makeTemplate('t-1', 'sleep', 0),
      makeTemplate('t-2', 'sleep', 60),
      makeTemplate('t-3', 'sleep', 120),
      makeTemplate('t-4', 'sleep', 180),
      makeTemplate('t-5', 'sleep', 240),
      makeTemplate('t-6', 'sleep', 300),
    ];

    const result = computeClusters(templates, 4);

    for (const assignment of result) {
      expect(assignment.clusterId).not.toBeNull();
      expect(assignment.clusterId).toBeGreaterThanOrEqual(0);
      expect(assignment.clusterId).toBeLessThanOrEqual(3);
    }
  });

  it('Test 3: templates with empty centroid get clusterId = null', () => {
    const templates: TemplateEmbedding[] = [
      { templateId: 'no-clips-a', domain: 'sleep', centroid: [] },
      { templateId: 'no-clips-b', domain: 'sleep', centroid: [] },
      makeTemplate('has-clips', 'sleep', 0),
    ];

    const result = computeClusters(templates, 4);

    const noClipsA = result.find((r) => r.templateId === 'no-clips-a');
    const noClipsB = result.find((r) => r.templateId === 'no-clips-b');
    const hasClips = result.find((r) => r.templateId === 'has-clips');

    expect(noClipsA!.clusterId).toBeNull();
    expect(noClipsB!.clusterId).toBeNull();
    expect(hasClips!.clusterId).not.toBeNull(); // has data → assigned a cluster
  });

  it('Test 4: same input always produces same output (deterministic seed)', () => {
    const templates: TemplateEmbedding[] = [
      makeTemplate('d-1', 'nutrition_gut', 10),
      makeTemplate('d-2', 'nutrition_gut', 100),
      makeTemplate('d-3', 'nutrition_gut', 190),
      makeTemplate('d-4', 'nutrition_gut', 280),
      makeTemplate('d-5', 'nutrition_gut', 50),
    ];

    const result1 = computeClusters(templates, 4);
    const result2 = computeClusters(templates, 4);

    // Cluster IDs must be identical across both runs
    for (let i = 0; i < result1.length; i++) {
      expect(result1[i]!.clusterId).toBe(result2[i]!.clusterId);
      expect(result1[i]!.templateId).toBe(result2[i]!.templateId);
    }
  });
});
