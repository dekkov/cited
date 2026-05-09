import { date, integer, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { userHabits } from './user-habits.js';

export const streaks = pgTable('streaks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userHabitId: uuid('user_habit_id')
    .notNull()
    .unique()
    .references(() => userHabits.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references((): any => sql`auth.users(id)`, { onDelete: 'cascade' }),
  currentLength: integer('current_length').notNull().default(0),
  longestLength: integer('longest_length').notNull().default(0),
  lastCheckInDate: date('last_check_in_date'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
