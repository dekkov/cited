import { describe, it, expect } from 'vitest';

describe('interview schemas', () => {
  describe('HabitCandidateSchema', () => {
    it('rejects when citations.length < 2 (REC-02)', async () => {
      const { HabitCandidateSchema } = await import('./schemas');
      const result = HabitCandidateSchema.safeParse({
        templateSlug: 'sleep-timing',
        title: 'Consistent sleep timing',
        rationale: 'Keeping a regular sleep schedule anchors your circadian rhythm.',
        domain: 'sleep',
        trigger: 'When my alarm goes off each morning at 7am',
        tinyAction: 'Get up within 5 minutes',
        citations: [
          {
            clipId: '11111111-1111-1111-1111-111111111111',
            claim: 'Consistent wake time anchors circadian rhythm.',
            speaker: 'Dr. Matthew Walker',
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('rejects when trigger is missing', async () => {
      const { HabitCandidateSchema } = await import('./schemas');
      const result = HabitCandidateSchema.safeParse({
        templateSlug: 'sleep-timing',
        title: 'Consistent sleep timing',
        rationale: 'Keeping a regular sleep schedule anchors your circadian rhythm.',
        domain: 'sleep',
        // trigger: missing
        tinyAction: 'Get up within 5 minutes',
        citations: [
          {
            clipId: '11111111-1111-1111-1111-111111111111',
            claim: 'Consistent wake time anchors circadian rhythm.',
            speaker: 'Dr. Matthew Walker',
          },
          {
            clipId: '22222222-2222-2222-2222-222222222222',
            claim: 'Sleep timing is more important than duration.',
            speaker: 'Dr. Matthew Walker',
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('rejects when tinyAction is missing', async () => {
      const { HabitCandidateSchema } = await import('./schemas');
      const result = HabitCandidateSchema.safeParse({
        templateSlug: 'sleep-timing',
        title: 'Consistent sleep timing',
        rationale: 'Keeping a regular sleep schedule anchors your circadian rhythm.',
        domain: 'sleep',
        trigger: 'When my alarm goes off each morning at 7am',
        // tinyAction: missing
        citations: [
          {
            clipId: '11111111-1111-1111-1111-111111111111',
            claim: 'Consistent wake time anchors circadian rhythm.',
            speaker: 'Dr. Matthew Walker',
          },
          {
            clipId: '22222222-2222-2222-2222-222222222222',
            claim: 'Sleep timing is more important than duration.',
            speaker: 'Dr. Matthew Walker',
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('accepts a valid HabitCandidate with 2 citations', async () => {
      const { HabitCandidateSchema } = await import('./schemas');
      const result = HabitCandidateSchema.safeParse({
        templateSlug: 'sleep-timing',
        title: 'Consistent sleep timing',
        rationale: 'Keeping a regular sleep schedule anchors your circadian rhythm and improves health.',
        domain: 'sleep',
        trigger: 'When my alarm goes off each morning at 7am',
        tinyAction: 'Get up within 5 minutes',
        citations: [
          {
            clipId: '11111111-1111-1111-1111-111111111111',
            claim: 'Consistent wake time anchors circadian rhythm.',
            speaker: 'Dr. Matthew Walker',
          },
          {
            clipId: '22222222-2222-2222-2222-222222222222',
            claim: 'Sleep timing is more important than duration.',
            speaker: 'Dr. Matthew Walker',
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('SynthesisOutputSchema', () => {
    it('rejects when candidates.length < 3 (REC-01)', async () => {
      const { SynthesisOutputSchema } = await import('./schemas');
      const validCandidate = {
        templateSlug: 'sleep-timing',
        title: 'Consistent sleep timing',
        rationale: 'Keeping a regular sleep schedule anchors your circadian rhythm and improves health.',
        domain: 'sleep',
        trigger: 'When my alarm goes off each morning',
        tinyAction: 'Get up within 5 minutes',
        citations: [
          { clipId: '11111111-1111-1111-1111-111111111111', claim: 'Claim 1', speaker: 'Speaker A' },
          { clipId: '22222222-2222-2222-2222-222222222222', claim: 'Claim 2', speaker: 'Speaker A' },
        ],
      };
      const result = SynthesisOutputSchema.safeParse({
        profileSummary: {
          gapDomains: ['sleep'],
          summaries: { sleep: 'You have poor sleep habits.' },
        },
        candidates: [validCandidate, validCandidate], // only 2 — should fail
      });
      expect(result.success).toBe(false);
    });

    it('rejects when gapDomains is empty', async () => {
      const { SynthesisOutputSchema } = await import('./schemas');
      const validCandidate = {
        templateSlug: 'sleep-timing',
        title: 'Consistent sleep timing',
        rationale: 'Keeping a regular sleep schedule anchors your circadian rhythm and improves health.',
        domain: 'sleep',
        trigger: 'When my alarm goes off each morning',
        tinyAction: 'Get up within 5 minutes',
        citations: [
          { clipId: '11111111-1111-1111-1111-111111111111', claim: 'Claim 1', speaker: 'Speaker A' },
          { clipId: '22222222-2222-2222-2222-222222222222', claim: 'Claim 2', speaker: 'Speaker A' },
        ],
      };
      const result = SynthesisOutputSchema.safeParse({
        profileSummary: {
          gapDomains: [], // empty — should fail
          summaries: {},
        },
        candidates: [validCandidate, validCandidate, validCandidate],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('retrieval types', () => {
    it('exports RankedClip and ClipRetrievalFilters from retrieval/index', async () => {
      // We can't instantiate types, but we can verify the module exports (via the barrel)
      const retrieval = await import('../retrieval/index');
      // These are type-only exports — verify the module loads without error
      expect(retrieval).toBeDefined();
    });

    it('core barrel exports retrieval and interview symbols', async () => {
      const core = await import('../index');
      // HabitCandidateSchema should be available from the barrel
      expect(core).toHaveProperty('HabitCandidateSchema');
      expect(core).toHaveProperty('SynthesisOutputSchema');
      expect(core).toHaveProperty('InterviewTurnOutputSchema');
      expect(core).toHaveProperty('CitationSchema');
      expect(core).toHaveProperty('DomainSchema');
    });
  });
});
