import { z } from 'zod';

export const suggestStartEndSchema = z.object({
  startSec: z.number().min(0),
  endSec: z.number(),
  rationale: z.string().min(10).max(500),
  quotedSpan: z.string().min(1),
});

export const refineClaimSchema = z.object({
  refinedClaim: z.string().min(10).max(2000),
  rationale: z.string().min(10).max(500),
  quotedSpan: z.string().min(1),
});

export const proposeAlternativeSchema = z.object({
  alternativeClaim: z.string().min(10).max(2000),
  rationale: z.string().min(10).max(500),
  quotedSpan: z.string().min(1),
});

export const copilotKindSchema = z.enum([
  'suggest-start-end',
  'refine-claim',
  'propose-alternative',
]);
export type CopilotKind = z.infer<typeof copilotKindSchema>;

export const copilotSchemaByKind = {
  'suggest-start-end': suggestStartEndSchema,
  'refine-claim': refineClaimSchema,
  'propose-alternative': proposeAlternativeSchema,
} as const;

export type SuggestStartEnd = z.infer<typeof suggestStartEndSchema>;
export type RefineClaim = z.infer<typeof refineClaimSchema>;
export type ProposeAlternative = z.infer<typeof proposeAlternativeSchema>;
