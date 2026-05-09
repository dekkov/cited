import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { userHabits } from './user-habits';

// Note: userId references auth.users(id) on delete cascade
// This FK is managed in migration SQL (auth.users is Supabase Auth — not introspectable by drizzle-kit)
export const streakFreezes = pgTable('streak_freezes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  userHabitId: uuid('user_habit_id')
    .notNull()
    .references(() => userHabits.id, { onDelete: 'cascade' }),
  bankedAt: timestamp('banked_at', { withTimezone: true }).notNull().defaultNow(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});
