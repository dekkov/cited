import { describe, it, expect } from 'vitest';
import { computeClusters, cosineDistance, type TemplateEmbedding } from './cluster';
import type { Domain } from '../interview/schemas';

function makeTemplate(id: string, domain: Domain, centroid: number[]): TemplateEmbedding {
  return { templateId: id, domain, centroid };
}

describe('computeClusters', () => {
  it('Test 1: templates near same centroid in same domain end up in same cluster', () => {
    // Two clear clusters: one near [1,0] and one near [0,1] in sleep domain
    const templates: TemplateEmbedding[] = [
      makeTemplate('a', 'sleep', [1.0, 0.01, 0.01]),
      makeTemplate('b', 'sleep', [0.99, 0.02, 0.01]),
      makeTemplate('c', 'sleep', [0.01, 1.0, 0.01]),
      makeTemplate('d', 'sleep', [0.02, 0.99, 0.01]),
      // Need 4 templates for k=4 to work, but for this test we want similar ones to cluster
      makeTemplate('e', 'sleep', [0.01, 0.01, 1.0]),
      makeTemplate('f', 'sleep', [0.02, 0.01, 0.99]),
    ];
    const result = computeClusters(templates, 3);
    const byId = Object.fromEntries(result.map((r) => [r.templateId, r.clusterId]));
    // a and b should be in the same cluster (both near [1,0,0])
    expect(byId['a']).toBe(byId['b']);
    // c and d should be in the same cluster (both near [0,1,0])
    expect(byId['c']).toBe(byId['d']);
    // e and f should be in the same cluster (both near [0,0,1])
    expect(byId['e']).toBe(byId['f']);
  });

  it('Test 2: k=4 per domain → cluster_id is in range 0..3', () => {
    const templates: TemplateEmbedding[] = Array.from({ length: 8 }, (_, i) => ({
      templateId: `t-${i}`,
      domain: 'sleep' as Domain,
      centroid: Array.from({ length: 4 }, (__, j) => (i === j % 4 ? 1 : 0.01)),
    }));
    const result = computeClusters(templates, 4);
    for (const r of result) {
      expect(r.clusterId).not.toBeNull();
      expect(r.clusterId!).toBeGreaterThanOrEqual(0);
      expect(r.clusterId!).toBeLessThanOrEqual(3);
    }
  });

  it('Test 3: templates with no clips (empty centroid) → cluster_id = null', () => {
    const templates: TemplateEmbedding[] = [
      makeTemplate('empty-1', 'sleep', []),
      makeTemplate('normal-1', 'sleep', [1, 0]),
    ];
    const result = computeClusters(templates);
    const empty = result.find((r) => r.templateId === 'empty-1');
    expect(empty?.clusterId).toBeNull();
  });

  it('Test 4: deterministic seed — same input produces same output across runs', () => {
    const templates: TemplateEmbedding[] = Array.from({ length: 6 }, (_, i) => ({
      templateId: `t-${i}`,
      domain: 'nutrition_gut' as Domain,
      centroid: [Math.sin(i * 0.7), Math.cos(i * 0.7), Math.sin(i * 1.3)],
    }));
    const result1 = computeClusters(templates, 3);
    const result2 = computeClusters(templates, 3);
    expect(result1).toEqual(result2);
  });

  it('cosineDistance returns 0 for identical vectors', () => {
    expect(cosineDistance([1, 0, 0], [1, 0, 0])).toBeCloseTo(0);
  });

  it('cosineDistance returns 1 for orthogonal vectors', () => {
    expect(cosineDistance([1, 0], [0, 1])).toBeCloseTo(1);
  });
});
