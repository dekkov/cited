import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { clips } from './clips';

// Dev-only staging table. Curator promotes accepted/rejected co-pilot suggestions here during Phase 2;
// at phase end ~20 rows promote to tests/eval/aion-10/fixtures.jsonl (Plan 06).
export const aion10FixtureCandidates = pgTable('aion10_fixture_candidates', {
  id: uuid('id').primaryKey().defaultRandom(),
  clipId: uuid('clip_id').references(() => clips.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),                                // 'suggest-start-end' | 'refine-claim' | 'propose-alternative'
  aiInput: jsonb('ai_input').notNull(),
  aiOutput: jsonb('ai_output').notNull(),
  expectedGrounded: boolean('expected_grounded'),              // curator's manual grade
  reviewerNotes: text('reviewer_notes'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
