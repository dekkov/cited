import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { clips } from './clips';

// Note: actorId references auth.users(id) on delete set null
// This FK is managed in migration SQL (auth.users is Supabase Auth — not introspectable by drizzle-kit)
export const clipEdits = pgTable('clip_edits', {
  id: uuid('id').primaryKey().defaultRandom(),
  clipId: uuid('clip_id')
    .notNull()
    .references(() => clips.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id'),
  source: text('source').notNull(),
  field: text('field').notNull(),
  beforeValue: jsonb('before_value'),
  afterValue: jsonb('after_value'),
  accepted: boolean('accepted'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
