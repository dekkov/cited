import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  migrations: { schema: 'public' },
  schemaFilter: ['public'],
  verbose: true,
  strict: true,
});
