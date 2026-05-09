import { date, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { checkInStatus } from './enums';
import { userHabits } from './user-habits';

// Note: userId references auth.users(id) on delete cascade
// This FK is managed in migration SQL (auth.users is Supabase Auth — not introspectable by drizzle-kit)
export const checkIns = pgTable(
  'check_ins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userHabitId: uuid('user_habit_id')
      .notNull()
      .references(() => userHabits.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    checkInDate: date('check_in_date').notNull(),
    status: checkInStatus('status').notNull(),
    mood: integer('mood'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userHabitId, t.checkInDate)],
);
