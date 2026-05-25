export { createDb } from './client';
export type { Db } from './client';
export * from './schema/index';
// Re-export commonly used Drizzle operators so callers share the same drizzle-orm instance
export {
  eq,
  and,
  or,
  not,
  isNull,
  isNotNull,
  inArray,
  notInArray,
  lt,
  lte,
  gt,
  gte,
  ne,
  sql,
  asc,
  desc,
} from 'drizzle-orm';
