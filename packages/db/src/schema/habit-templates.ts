import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { clipDomain, frequency } from './enums.js';

export const habitTemplates = pgTable('habit_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  domain: clipDomain('domain').notNull(),
  trigger: text('trigger'),
  tinyAction: text('tiny_action'),
  defaultFrequency: frequency('default_frequency').notNull().default('daily'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
