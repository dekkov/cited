import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';
import { episodes } from './episodes';

export const transcriptChunks = pgTable('transcript_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  episodeId: uuid('episode_id')
    .notNull()
    .references(() => episodes.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  startSeconds: integer('start_seconds'),
  endSeconds: integer('end_seconds'),
  embedding: vector('embedding', { dimensions: 1536 }),
});
