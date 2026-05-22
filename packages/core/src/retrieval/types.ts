// Re-use Domain from interview/schemas to avoid a duplicate export at the barrel level
import type { Domain } from '../interview/schemas';
export type { Domain };

export type ClipRetrievalFilters = {
  readonly domains?: readonly Domain[];
  readonly excludeRiskFlags?: readonly string[]; // e.g. ['supplement','medical_advice','contraindication']
  readonly excludeClipIds?: readonly string[]; // for swap
  readonly speakerStatus?: readonly ('verified' | 'unverified' | 'host')[];
};

export type RankedClip = {
  readonly clipId: string;
  readonly similarityScore: number; // RRF-combined
  readonly vectorScore: number;
  readonly textScore: number;
  readonly claim: string;
  readonly speaker: string;
  readonly domain: Domain;
};
