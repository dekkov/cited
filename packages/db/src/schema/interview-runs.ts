import { integer, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

// userId references auth.users(id) on delete cascade — FK managed in migration SQL
// (auth schema is Supabase Auth — not introspectable by drizzle-kit)
export const interviewRuns = pgTable('interview_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  runIndex: integer('run_index').notNull(), // 1-based; user's nth interview
  profileJson: jsonb('profile_json'), // SynthesisOutputSchema.profileSummary; null while in-progress
  candidatesJson: jsonb('candidates_json'), // HabitCandidate[]; null while in-progress
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }), // null = still running
});
