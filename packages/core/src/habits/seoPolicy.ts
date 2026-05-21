/**
 * SEO policy for public habit pages.
 *
 * Habit templates backed by clips with certain risk flags must not be indexed
 * by search engines (PUB-04 + LGL-08 interaction). This applies to supplement,
 * medical_advice, and contraindication content.
 */

export const NO_INDEX_RISK_FLAGS: readonly string[] = [
  'supplement',
  'medical_advice',
  'contraindication',
];

/**
 * Returns true if the clip's risk_flags overlap with the no-index set.
 *
 * Per-clip check — use templateShouldNoIndex for a habit template with multiple clips.
 */
export function shouldNoIndex(args: { risk_flags: readonly string[] }): boolean {
  return args.risk_flags.some((f) => NO_INDEX_RISK_FLAGS.includes(f));
}

/**
 * Aggregate version: a habit_template is no-indexed if ANY of its cited clips matches.
 *
 * Pass all clips associated with the template.
 */
export function templateShouldNoIndex(
  citedClips: readonly { risk_flags: readonly string[] }[],
): boolean {
  return citedClips.some((c) => shouldNoIndex({ risk_flags: c.risk_flags }));
}
