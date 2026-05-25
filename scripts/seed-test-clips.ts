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

import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getEmbeddings } from '../packages/core/src/llm/registry';
import * as schema from '../packages/db/src/schema/index';

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
  // ── Second wave: diversified mechanisms per domain so the swap query's
  //    `cosine_distance > 0.7` gate has substantively-different alternatives.
  //    One nutrition entry carries risk_flags: ['supplement'] to exercise the
  //    SEO no-index path and sitemap exclusion (HAB-06 + SEO policy).
  {
    domain: 'sleep' as const,
    title: 'Morning light exposure',
    slug: 'morning-light-exposure',
    trigger: 'Within 30 minutes of waking',
    tinyAction: 'Step outside for 10 minutes of direct sunlight (no sunglasses).',
    claim:
      'Bright outdoor light within 30 minutes of waking anchors the circadian clock — 100,000+ lux for 10 minutes shifts melatonin onset earlier by roughly 30 minutes that night.',
    rationale:
      'Suprachiasmatic-nucleus photoentrainment via ipRGC melanopsin pathway; outdoor light is 10–100× brighter than indoor.',
    speaker: 'Andrew Huberman',
    startSeconds: 410,
    endSeconds: 500,
  },
  {
    domain: 'nutrition_gut' as const,
    title: 'Daily creatine for cognition',
    slug: 'daily-creatine-cognition',
    trigger: 'With morning coffee',
    tinyAction: 'Stir 5 g of creatine monohydrate into your drink.',
    claim:
      'A daily 5-gram dose of creatine monohydrate improves working memory and reasoning performance on sleep-deprived days by replenishing brain phosphocreatine stores.',
    rationale:
      'Cognitive benefit demonstrated in RCTs under fatigue conditions; effect strongest with consistent daily dosing.',
    speaker: 'Andrew Huberman',
    startSeconds: 950,
    endSeconds: 1040,
    // SEO/risk: this is supplement content — public /h/[slug] must noindex and be omitted from sitemap.
    riskFlags: ['supplement'] as const,
  },
  {
    domain: 'exercise_longevity' as const,
    title: 'Twice-weekly resistance training',
    slug: 'twice-weekly-resistance',
    trigger: 'Two non-consecutive weekday evenings',
    tinyAction: 'Do a 25-minute full-body lift (squat, push, pull, hinge).',
    claim:
      'Two resistance-training sessions per week — even 25 minutes each — preserve muscle mass and bone density after age 40 and reduce all-cause mortality by 15–20% independent of cardio.',
    rationale:
      'Sarcopenia prevention via mTOR activation; observational mortality data from Cooper Clinic and Korean longitudinal cohorts.',
    speaker: 'Peter Attia',
    startSeconds: 1450,
    endSeconds: 1540,
  },
  {
    domain: 'mental_health' as const,
    title: 'Five-minute physiological sigh',
    slug: 'five-minute-physiological-sigh',
    trigger: 'When you notice acute stress',
    tinyAction:
      'Two short inhales through the nose, one long exhale through the mouth — repeat for one minute.',
    claim:
      'A single minute of physiological sighing — double inhale followed by extended exhale — lowers state anxiety more quickly than equivalent-duration mindful breathing or box breathing.',
    rationale:
      'Stanford 2023 RCT showed measurable reduction in heart-rate variability stress markers within 5 minutes vs. control breathwork modalities.',
    speaker: 'Andrew Huberman',
    startSeconds: 200,
    endSeconds: 290,
  },
] as const;

// ── Supporting clips ─────────────────────────────────────────────────────────
// SWAP-03 requires ≥2 validated citations per habit_template; the primary CLIPS
// above provide one. These add a second clip per template — same episode, distinct
// claim and timestamp — so swap candidates clear the citation-count gate.
const SUPPORTING_CLIPS = [
  {
    templateSlug: 'fixed-sleep-wake-time',
    claim:
      'Weekend lie-ins of more than 90 minutes shift the circadian clock back by an hour and produce measurable Monday-morning sleep inertia equivalent to mild jet lag.',
    rationale: 'Social-jetlag literature (Roenneberg) quantifies the weekend-shift effect.',
    speaker: 'Matthew Walker',
    startSeconds: 240,
    endSeconds: 320,
  },
  {
    templateSlug: 'cool-bedroom-deep-sleep',
    claim:
      'A warm bath one to two hours before bed paradoxically lowers core temperature by triggering peripheral vasodilation, helping induce sleep onset by 36% on average.',
    rationale: 'Texas A&M meta-analysis of 17 bath-and-sleep trials.',
    speaker: 'Matthew Walker',
    startSeconds: 760,
    endSeconds: 830,
  },
  {
    templateSlug: 'thirty-plants-a-week',
    claim:
      'Polyphenol-rich plants — colored vegetables, berries, herbs — feed Akkermansia and other beneficial gut bacteria that strengthen the intestinal mucosal barrier.',
    rationale: 'American Gut Project data on diet-microbiome correlation.',
    speaker: 'Tim Spector',
    startSeconds: 420,
    endSeconds: 500,
  },
  {
    templateSlug: 'daily-fermented-food',
    claim:
      'Two servings of fermented foods per day produce broader microbiome diversity gains than a single serving — dose-response holds at least up to six servings per day.',
    rationale: 'Wastyk et al. 2021 follow-up arm.',
    speaker: 'Tim Spector',
    startSeconds: 970,
    endSeconds: 1050,
  },
  {
    templateSlug: 'build-vo2-max',
    claim:
      'Norwegian 4x4 protocols — four 4-minute hard intervals separated by 3-minute recoveries — raise VO2 max by 10–15% in untrained adults within eight weeks.',
    rationale: 'Helgerud et al. 2007 RCT comparing interval modalities.',
    speaker: 'Peter Attia',
    startSeconds: 580,
    endSeconds: 660,
  },
  {
    templateSlug: 'weekly-zone-2-cardio',
    claim:
      'Mitochondrial density and oxidative capacity respond more to cumulative weekly Zone-2 minutes than to intensity above the lactate threshold.',
    rationale: 'San Millán muscle-biopsy work on metabolic flexibility.',
    speaker: 'Peter Attia',
    startSeconds: 1130,
    endSeconds: 1210,
  },
  {
    templateSlug: 'daily-nsdr-session',
    claim:
      'Brief NSDR practice between cognitively demanding tasks restores focus more effectively than caffeine without the dopamine-receptor downregulation of repeated stimulant use.',
    rationale: 'Stanford prefrontal-cortex recovery imaging studies.',
    speaker: 'Andrew Huberman',
    startSeconds: 870,
    endSeconds: 950,
  },
  {
    templateSlug: 'three-day-expressive-writing',
    claim:
      'Expressive writing benefits scale with emotional engagement, not literary quality — handwritten, unstructured releases outperform polished prose.',
    rationale: 'Pennebaker meta-analysis stratification by writing style.',
    speaker: 'Andrew Huberman',
    startSeconds: 1340,
    endSeconds: 1410,
  },
  {
    templateSlug: 'morning-light-exposure',
    claim:
      'Even on overcast days, outdoor light delivers 10,000–25,000 lux — orders of magnitude more circadian signal than the brightest indoor lighting at 500 lux.',
    rationale: 'Photometric measurements across weather conditions.',
    speaker: 'Andrew Huberman',
    startSeconds: 510,
    endSeconds: 590,
  },
  {
    templateSlug: 'daily-creatine-cognition',
    claim:
      'Creatine monohydrate at 5 g/day reaches steady-state brain saturation in roughly four weeks; loading doses accelerate the timeline but offer no long-term advantage.',
    rationale: 'PK studies on creatine brain uptake kinetics.',
    speaker: 'Andrew Huberman',
    startSeconds: 1060,
    endSeconds: 1140,
    // Supplement content — paired with primary clip's risk flag for the noindex/sitemap path.
    riskFlags: ['supplement'] as const,
  },
  {
    templateSlug: 'twice-weekly-resistance',
    claim:
      'Compound movements — squat, deadlift, press, row — recruit ten times more motor units than isolation exercises and drive the bulk of hypertrophy and bone-density gains.',
    rationale: 'EMG and bone-mineral-density comparison data.',
    speaker: 'Peter Attia',
    startSeconds: 1570,
    endSeconds: 1650,
  },
  {
    templateSlug: 'five-minute-physiological-sigh',
    claim:
      'Reinflating collapsed alveoli with the second short inhale is the mechanistic basis of the physiological sigh; this is why a single inhale of equal duration does not produce the same effect.',
    rationale: 'Pulmonary physiology — alveolar recruitment.',
    speaker: 'Andrew Huberman',
    startSeconds: 310,
    endSeconds: 390,
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
        // riskFlags only set on entries that declare them (e.g. supplement content).
        // Drizzle column defaults to '{}'::text[] when omitted; spread keeps that path clean.
        ...('riskFlags' in c && c.riskFlags ? { riskFlags: [...c.riskFlags] } : {}),
      })),
    )
    .returning({ id: schema.clips.id });

  console.log(`  Inserted ${inserted.length} clips.`);

  // 6. Upsert one habit_template per clip + junction row
  console.log(`Upserting ${CLIPS.length} habit_templates + junctions…`);
  const templateIdBySlug = new Map<string, string>();
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
    templateIdBySlug.set(c.slug, tpl.id);
    await db
      .insert(schema.habitTemplateClips)
      .values({ habitTemplateId: tpl.id, clipId, position: 1 })
      .onConflictDoNothing();
  }
  console.log(`  Upserted ${CLIPS.length} habit_templates.`);

  // 7. Insert supporting clips so every template clears SWAP-03's ≥2-citation gate.
  console.log(`Inserting ${SUPPORTING_CLIPS.length} supporting clips + junctions…`);
  const supportingEmbeddings = await embedClaims(SUPPORTING_CLIPS.map((c) => c.claim));
  for (let i = 0; i < SUPPORTING_CLIPS.length; i++) {
    const supp = SUPPORTING_CLIPS[i]!;
    const tplId = templateIdBySlug.get(supp.templateSlug);
    if (!tplId) {
      console.warn(`  Skipping supporting clip for unknown template ${supp.templateSlug}`);
      continue;
    }
    // Look up the parent template's domain — supporting clips inherit it (kept off the
    // SUPPORTING_CLIPS shape to avoid duplication).
    const parent = CLIPS.find((c) => c.slug === supp.templateSlug);
    if (!parent) continue;

    const [clipRow] = await db
      .insert(schema.clips)
      .values({
        episodeId: episode.id,
        youtubeVideoId: TEST_VIDEO_ID,
        startSeconds: supp.startSeconds,
        endSeconds: supp.endSeconds,
        claim: supp.claim,
        rationale: supp.rationale,
        speaker: supp.speaker,
        speakerStatus: 'verified' as const,
        domain: parent.domain,
        evidenceStrength: 'observational' as const,
        status: 'approved' as const,
        approvedAt: new Date(),
        embedding: supportingEmbeddings[i] as number[],
        ...('riskFlags' in supp && supp.riskFlags ? { riskFlags: [...supp.riskFlags] } : {}),
      })
      .returning({ id: schema.clips.id });
    if (!clipRow) throw new Error(`Failed to insert supporting clip for ${supp.templateSlug}`);

    await db
      .insert(schema.habitTemplateClips)
      .values({ habitTemplateId: tplId, clipId: clipRow.id, position: 2 })
      .onConflictDoNothing();
  }
  console.log(`  Inserted ${SUPPORTING_CLIPS.length} supporting clips.`);

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
