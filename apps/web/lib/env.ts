import { z } from 'zod';

const Env = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(), // server-only
  DATABASE_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().min(20).optional(),
  ANTHROPIC_API_KEY: z.string().min(20).optional(),
  // Phase 2 — transcript fallback (GA3 path D)
  DEEPGRAM_API_KEY: z.string().min(20).optional(),
  // Phase 2 — pg_cron oEmbed handler shared secret (ADMN-08)
  CRON_SECRET: z.string().min(16).optional(),
});

export const env = Env.parse(process.env);
