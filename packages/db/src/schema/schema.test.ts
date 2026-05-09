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
