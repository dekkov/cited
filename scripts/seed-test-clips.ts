/**
 * Seed a handful of dev-only test clips so the interview → recommendations
 * flow can be exercised without going through the full editorial pipeline.
 *
 * Usage:
 *   pnpm tsx scripts/seed-test-clips.ts           # insert (idempotent)
 *   pnpm tsx scripts/seed-test-clips.ts --remove  # delete everything inserted by this script
 */
import * as path from 'node:path';
import { config } from 'dotenv';

// Load apps/web env before any package code runs (needs OPENAI_API_KEY + DATABASE_URL)
config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../packages/db/src/schema/index';
import { getEmbeddings } from '../packages/core/src/llm/registry';

// ── Test data (2 clips per domain, 8 total) ───────────────────────────────────

const TEST_PODCAST_NAME = '__dev_seed__';
const TEST_VIDEO_ID = 'dQw4w9WgXcQ'; // any public YouTube ID; no real content implied

const CLIPS = [
  {
    domain: 'sleep' as const,
    title: 'Fixed sleep & wake time',
    slug: 'fixed-sleep-wake-time',
    trigger: 'After dinner',
    tinyAction: 'Set tomorrow’s alarm before bed (same time every day).',
    claim:
      'Going to bed and waking at the same time every day — even weekends — anchors your circadian rhythm and improves sleep quality within two weeks.',
    rationale: 'Circadian consistency reduces sleep-onset latency and increases slow-wave sleep.',
    speaker: 'Matthew Walker',
    startSeconds: 120,
    endSeconds: 210,
  },
  {
    domain: 'sleep' as const,
    title: 'Cool bedroom for deep sleep',
    slug: 'cool-bedroom-deep-sleep',
    trigger: 'Before bed',
    tinyAction: 'Set thermostat to 18 °C (65 °F) one hour before sleep.',
    claim:
      'Keeping your bedroom below 18 °C (65 °F) triggers the core-body-temperature drop required to initiate and maintain deep sleep.',
    rationale: 'Core body temperature must fall 1–2 °C to enter NREM slow-wave sleep.',
    speaker: 'Matthew Walker',
    startSeconds: 630,
    endSeconds: 720,
  },
  {
    domain: 'nutrition_gut' as const,
    title: '30 plants a week',
    slug: 'thirty-plants-a-week',
    trigger: 'Weekly grocery shop',
    tinyAction: 'List 30 plant species (herbs, nuts, seeds count) for the week.',
    claim:
      'Eating 30 or more different plant species per week measurably increases gut microbiome diversity in as little as four weeks.',
    rationale:
      'Fibre variety feeds distinct bacterial taxa; diversity correlates with metabolic and immune resilience.',
    speaker: 'Tim Spector',
    startSeconds: 300,
    endSeconds: 390,
  },
  {
    domain: 'nutrition_gut' as const,
    title: 'Daily fermented food',
    slug: 'daily-fermented-food',
    trigger: 'Breakfast or lunch',
    tinyAction: 'Add one serving of yoghurt, kefir, or kimchi to a daily meal.',
    claim:
      'Fermented foods consumed daily — plain yoghurt, kefir, or kimchi — raise microbiome diversity and lower 19 inflammatory proteins more than a high-fibre diet alone.',
    rationale:
      'Stanford RCT (Wastyk et al., 2021) measured immune and microbiome outcomes across 10 weeks.',
    speaker: 'Tim Spector',
    startSeconds: 850,
    endSeconds: 940,
  },
  {
    domain: 'exercise_longevity' as const,
    title: 'Build VO2 max',
    slug: 'build-vo2-max',
    trigger: 'Weekend morning',
    tinyAction: 'Do one 4-minute all-out interval after a warmup.',
    claim:
      'VO2 max is the single strongest predictor of all-cause mortality — moving from the bottom to the middle fitness quintile cuts risk of early death by 50 %.',
    rationale:
      'Prospective data from the Cooper Clinic cohort (>100 k participants, 25+ year follow-up).',
    speaker: 'Peter Attia',
    startSeconds: 540,
    endSeconds: 630,
  },
  {
    domain: 'exercise_longevity' as const,
    title: 'Weekly Zone-2 cardio',
    slug: 'weekly-zone-2-cardio',
    trigger: 'Three weekday mornings',
    tinyAction: 'Walk briskly for 45 minutes at conversational pace.',
    claim:
      'Zone-2 cardio — a pace where you can still hold a conversation — done for 150–180 minutes per week maximises mitochondrial biogenesis and metabolic efficiency.',
    rationale:
      'Zone 2 preferentially recruits slow-twitch fibres, improving fat oxidation and lactate clearance.',
    speaker: 'Peter Attia',
    startSeconds: 1020,
    endSeconds: 1110,
  },
  {
    domain: 'mental_health' as const,
    title: 'Daily NSDR session',
    slug: 'daily-nsdr-session',
    trigger: 'Early afternoon',
    tinyAction: 'Lie down for 10 minutes with a guided NSDR audio.',
    claim:
      'A daily non-sleep deep-rest (NSDR) session of 10–20 minutes restores dopamine levels in the striatum and reduces mental fatigue.',
    rationale:
      'fMRI studies show striatal dopamine recovery matches that of a 90-min sleep episode.',
    speaker: 'Andrew Huberman',
    startSeconds: 760,
    endSeconds: 850,
  },
  {
    domain: 'mental_health' as const,
    title: 'Three-day expressive writing',
    slug: 'three-day-expressive-writing',
    trigger: 'A stressful event',
    tinyAction: 'Write 15 minutes about it for three consecutive days.',
    claim:
      'Writing about a stressful experience for 15–20 minutes on three consecutive days reduces anxiety and improves immune function for up to six months.',
    rationale:
      'Pennebaker expressive-writing paradigm replicated in 200+ RCTs across diverse populations.',
    speaker: 'Andrew Huberman',
    startSeconds: 1240,
    endSeconds: 1330,
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getConnection() {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL is not set — check apps/web/.env.local');
  return postgres(url, { prepare: false, max: 1 });
}

async function embedClaims(claims: string[]): Promise<number[][]> {
  console.log(`  Calling text-embedding-3-small for ${claims.length} claims…`);
  const { embeddings } = await getEmbeddings().embed({ input: claims });
  return embeddings;
}

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  const sql = getConnection();
  const db = drizzle(sql, { schema });

  // 1. Find or create podcast (no unique constraint on name — select-first)
  console.log('Finding or creating test podcast…');
  const existingPodcasts = await db
    .select({ id: schema.podcasts.id })
    .from(schema.podcasts)
    .where(eq(schema.podcasts.name, TEST_PODCAST_NAME))
    .limit(1);

  let podcastId: string;
  if (existingPodcasts[0]) {
    podcastId = existingPodcasts[0].id;
    console.log(`  Using existing podcast ${podcastId}`);
  } else {
    const [p] = await db
      .insert(schema.podcasts)
      .values({ name: TEST_PODCAST_NAME, host: 'Dev Seed', trustTier: 1 })
      .returning({ id: schema.podcasts.id });
    if (!p) throw new Error('Failed to insert podcast');
    podcastId = p.id;
    console.log(`  Created podcast ${podcastId}`);
  }

  // 2. Upsert episode (youtubeVideoId has a unique constraint)
  console.log('Upserting test episode…');
  const [episode] = await db
    .insert(schema.episodes)
    .values({ podcastId, youtubeVideoId: TEST_VIDEO_ID, title: '[Dev Seed] Test Episode' })
    .onConflictDoUpdate({
      target: schema.episodes.youtubeVideoId,
      set: { updatedAt: new Date() },
    })
    .returning({ id: schema.episodes.id });
  if (!episode) throw new Error('Failed to upsert episode');
  console.log(`  episode.id = ${episode.id}`);

  // 3. Wipe previous seed clips for this episode (idempotent re-run)
  await db.delete(schema.clips).where(eq(schema.clips.episodeId, episode.id));

  // 4. Generate embeddings via the same provider used at runtime
  const embeddings = await embedClaims(CLIPS.map((c) => c.claim));

  // 5. Insert clips
  console.log(`Inserting ${CLIPS.length} clips…`);
  const inserted = await db
    .insert(schema.clips)
    .values(
      CLIPS.map((c, i) => ({
        episodeId: episode.id,
        youtubeVideoId: TEST_VIDEO_ID,
        startSeconds: c.startSeconds,
        endSeconds: c.endSeconds,
        claim: c.claim,
        rationale: c.rationale,
        speaker: c.speaker,
        speakerStatus: 'verified' as const,
        domain: c.domain,
        evidenceStrength: 'observational' as const,
        status: 'approved' as const,
        approvedAt: new Date(),
        embedding: embeddings[i] as number[],
      })),
    )
    .returning({ id: schema.clips.id });

  console.log(`  Inserted ${inserted.length} clips.`);

  // 6. Upsert one habit_template per clip + junction row
  console.log(`Upserting ${CLIPS.length} habit_templates + junctions…`);
  for (let i = 0; i < CLIPS.length; i++) {
    const c = CLIPS[i]!;
    const clipId = inserted[i]!.id;
    const [tpl] = await db
      .insert(schema.habitTemplates)
      .values({
        slug: c.slug,
        title: c.title,
        description: c.rationale,
        domain: c.domain,
        trigger: c.trigger,
        tinyAction: c.tinyAction,
      })
      .onConflictDoUpdate({
        target: schema.habitTemplates.slug,
        set: {
          title: c.title,
          description: c.rationale,
          domain: c.domain,
          trigger: c.trigger,
          tinyAction: c.tinyAction,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.habitTemplates.id });
    if (!tpl) throw new Error(`Failed to upsert habit_template for slug=${c.slug}`);
    await db
      .insert(schema.habitTemplateClips)
      .values({ habitTemplateId: tpl.id, clipId, position: 1 })
      .onConflictDoNothing();
  }
  console.log(`  Upserted ${CLIPS.length} habit_templates.`);

  console.log('\nDone. Run cluster-assignment next, then the onboarding interview.');
  await sql.end();
}

// ── Remove ────────────────────────────────────────────────────────────────────

async function remove() {
  const sql = getConnection();
  const db = drizzle(sql, { schema });

  console.log('Removing seed data…');
  const seedPodcasts = await db
    .select({ id: schema.podcasts.id })
    .from(schema.podcasts)
    .where(eq(schema.podcasts.name, TEST_PODCAST_NAME));

  if (seedPodcasts.length === 0) {
    console.log('  Nothing to remove.');
    await sql.end();
    return;
  }

  const podcastIds = seedPodcasts.map((p) => p.id);
  const seedEpisodes = await db
    .select({ id: schema.episodes.id })
    .from(schema.episodes)
    .where(inArray(schema.episodes.podcastId, podcastIds));

  const episodeIds = seedEpisodes.map((e) => e.id);
  if (episodeIds.length > 0) {
    const seedClips = await db
      .delete(schema.clips)
      .where(inArray(schema.clips.episodeId, episodeIds))
      .returning({ id: schema.clips.id });
    await db.delete(schema.episodes).where(inArray(schema.episodes.id, episodeIds));
    // habit_template_clips rows cascade with clips; orphan habit_templates by slug
    const slugs = CLIPS.map((c) => c.slug);
    if (slugs.length > 0) {
      await db.delete(schema.habitTemplates).where(inArray(schema.habitTemplates.slug, slugs));
    }
    console.log(
      `  Deleted ${seedClips.length} clips, ${episodeIds.length} episode(s), ${slugs.length} habit_templates.`,
    );
  }
  await db.delete(schema.podcasts).where(inArray(schema.podcasts.id, podcastIds));
  console.log(`  Deleted ${podcastIds.length} podcast(s).`);
  await sql.end();
}

// ── Entry ─────────────────────────────────────────────────────────────────────

const removing = process.argv.includes('--remove');
(removing ? remove() : seed()).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
