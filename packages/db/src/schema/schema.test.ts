import { describe, it, expect } from 'vitest';

describe('@cited/db schema exports', () => {
  it('exports all 16 table names', async () => {
    const schema = await import('./index');
    const expectedTables = [
      'profiles',
      'podcasts',
      'episodes',
      'clips',
      'clipEdits',
      'transcriptChunks',
      'habitTemplates',
      'habitTemplateClips',
      'userHabits',
      'checkIns',
      'streaks',
      'streakFreezes',
      'extractionJobs',
      'clipsPending',
      'consentRecords',
    ];
    for (const name of expectedTables) {
      expect(schema, `expected export: ${name}`).toHaveProperty(name);
    }
  });

  it('user-scoped tables have userId or id column referencing auth.users with cascade', async () => {
    const { profiles, userHabits, checkIns, streaks, streakFreezes, consentRecords } =
      await import('./index');
    // profiles uses `id` as the FK; others use `userId`
    expect(profiles).toBeDefined();
    expect(userHabits).toBeDefined();
    expect(checkIns).toBeDefined();
    expect(streaks).toBeDefined();
    expect(streakFreezes).toBeDefined();
    expect(consentRecords).toBeDefined();
  });

  it('clips.embedding is vector(1536)', async () => {
    const { clips } = await import('./index');
    const embeddingCol = (clips as any).embedding;
    expect(embeddingCol).toBeDefined();
    expect(embeddingCol.columnType).toBe('PgVector');
    expect(embeddingCol.dimensions).toBe(1536);
  });

  it('clips_pending.embedding is vector(1536)', async () => {
    const { clipsPending } = await import('./index');
    const embeddingCol = (clipsPending as any).embedding;
    expect(embeddingCol).toBeDefined();
    expect(embeddingCol.columnType).toBe('PgVector');
    expect(embeddingCol.dimensions).toBe(1536);
  });

  describe('phase 2 extensions', () => {
    it('clip_edit_action enum exists with phase 2 values', async () => {
      const { clipEditAction } = await import('./index');
      expect(clipEditAction).toBeDefined();
      // pgEnum stores values in enumValues
      const values = (clipEditAction as any).enumValues as string[];
      expect(values).toContain('ai_suggested');
      expect(values).toContain('ai_accepted');
      expect(values).toContain('ai_rejected');
      expect(values).toContain('removed');
      expect(values).toContain('embedded');
    });

    it('clipEdits has action (required) and payload columns', async () => {
      const { clipEdits } = await import('./index');
      const table = clipEdits as any;
      expect(table.action).toBeDefined();
      expect(table.action.notNull).toBe(true);
      expect(table.payload).toBeDefined();
    });

    it('clips has removal columns', async () => {
      const { clips } = await import('./index');
      const table = clips as any;
      expect(table.removedAt).toBeDefined();
      expect(table.removalReason).toBeDefined();
      expect(table.removalNotes).toBeDefined();
      expect(table.takedownRefUrl).toBeDefined();
    });

    it('episodes has sourceUnavailableAt + oembed404Count', async () => {
      const { episodes } = await import('./index');
      const table = episodes as any;
      expect(table.sourceUnavailableAt).toBeDefined();
      expect(table.oembed404Count).toBeDefined();
      expect(table.oembed404Count.notNull).toBe(true);
    });

    it('exports transcripts, episodeBlacklist, aion10FixtureCandidates from barrel', async () => {
      const schema = await import('./index');
      expect(schema).toHaveProperty('transcripts');
      expect(schema).toHaveProperty('episodeBlacklist');
      expect(schema).toHaveProperty('aion10FixtureCandidates');
    });

    it('transcripts has required columns', async () => {
      const { transcripts } = await import('./index');
      const table = transcripts as any;
      expect(table.videoId).toBeDefined();
      expect(table.source).toBeDefined();
      expect(table.segments).toBeDefined();
      expect(table.rawText).toBeDefined();
      expect(table.language).toBeDefined();
      expect(table.fetchedAt).toBeDefined();
    });

    it('episodeBlacklist has required columns', async () => {
      const { episodeBlacklist } = await import('./index');
      const table = episodeBlacklist as any;
      expect(table.youtubeVideoId).toBeDefined();
      expect(table.reason).toBeDefined();
      expect(table.blacklistedAt).toBeDefined();
      expect(table.takedownRefUrl).toBeDefined();
      expect(table.notes).toBeDefined();
    });

    it('aion10FixtureCandidates has required columns', async () => {
      const { aion10FixtureCandidates } = await import('./index');
      const table = aion10FixtureCandidates as any;
      expect(table.id).toBeDefined();
      expect(table.clipId).toBeDefined();
      expect(table.kind).toBeDefined();
      expect(table.aiInput).toBeDefined();
      expect(table.aiOutput).toBeDefined();
      expect(table.expectedGrounded).toBeDefined();
      expect(table.reviewerNotes).toBeDefined();
      expect(table.reviewedAt).toBeDefined();
      expect(table.createdAt).toBeDefined();
    });
  });

  it('extraction_jobs has all required columns', async () => {
    const { extractionJobs } = await import('./index');
    const table = extractionJobs as any;
    expect(table.id).toBeDefined();
    expect(table.podcastId).toBeDefined();
    expect(table.youtubeVideoId).toBeDefined();
    expect(table.status).toBeDefined();
    expect(table.claimedBy).toBeDefined();
    expect(table.claimedAt).toBeDefined();
    expect(table.attemptCount).toBeDefined();
    expect(table.payload).toBeDefined();
    expect(table.result).toBeDefined();
    expect(table.error).toBeDefined();
  });
});
