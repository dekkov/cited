import { defineConfig } from 'drizzle-kit';

function getDbCredentials() {
  const url = process.env.DATABASE_URL!;
  const pass = process.env.DB_PASSWORD;
  if (!pass) return { url };
  // Pass password as a plain string to avoid URL percent-encoding issues (e.g. # in passwords).
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 5432,
    user: decodeURIComponent(u.username),
    password: pass,
    database: u.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  };
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: getDbCredentials(),
  migrations: { schema: 'public' },
  schemaFilter: ['public'],
  verbose: true,
  strict: true,
});
