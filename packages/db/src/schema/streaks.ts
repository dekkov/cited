import { date, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { userHabits } from './user-habits';

// Note: userId references auth.users(id) on delete cascade
// This FK is managed in migration SQL (auth.users is Supabase Auth — not introspectable by drizzle-kit)
export const streaks = pgTable('streaks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userHabitId: uuid('user_habit_id')
    .notNull()
    .unique()
    .references(() => userHabits.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  currentLength: integer('current_length').notNull().default(0),
  longestLength: integer('longest_length').notNull().default(0),
  lastCheckInDate: date('last_check_in_date'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
