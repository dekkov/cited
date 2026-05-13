import { z } from 'zod';
import { DomainSchema } from './schemas';

export const FetchRelevantClipsInput = z.object({
  query: z.string().min(3).describe('Short search phrase capturing the user need'),
  domain: DomainSchema.optional().describe('Constrain retrieval to a specific domain'),
});
export type FetchRelevantClipsInput = z.infer<typeof FetchRelevantClipsInput>;
