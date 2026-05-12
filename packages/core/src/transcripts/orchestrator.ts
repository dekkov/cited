import { type DeepgramFetchInput, deepgramProvider } from './deepgram';
import { manualProvider } from './manual';
import type { TranscriptFetchInput, TranscriptResult } from './types';
import { youtubeProvider } from './youtube';

export type OrchestratorInput = TranscriptFetchInput & { audioUrl?: string };

/**
 * Dispatches transcript fetch across the three providers per Phase 2's path-D contract:
 * 1. Manual file upload wins outright.
 * 2. Audio URL → Deepgram (Phase 5-style; not common in Phase 2).
 * 3. YouTube URL/videoId → try captions; on missing/non-English/short captions, throw a
 *    curator-facing error directing them to upload a manual transcript. We do NOT silently
 *    fall back to Deepgram here because Deepgram cannot transcribe a YouTube URL directly
 *    in Phase 2 — audio extraction is a Phase 5 deliverable (yt-dlp + worker).
 */
export async function fetchTranscript(input: OrchestratorInput): Promise<TranscriptResult> {
  // 1) Manual upload wins if a file is supplied.
  if (input.file) return manualProvider.fetch(input);

  // 2) Audio URL → Deepgram (Phase 5 ingress point; rare in Phase 2).
  if (input.audioUrl) return deepgramProvider.fetch(input as DeepgramFetchInput);

  // 3) YouTube URL / videoId path: try captions, otherwise raise the manual-fallback error.
  if (input.url || input.videoId) {
    try {
      const yt = await youtubeProvider.fetch(input);
      const langOk = yt.language === 'en' || yt.language.startsWith('en-');
      if (yt.words.length > 50 && langOk) {
        return yt;
      }
      // Captions present but too short / wrong language → fall through to the explicit error.
    } catch {
      // YouTube captions missing or fetch failed → fall through to the explicit error.
    }
    // Phase 2 limitation: Deepgram cannot transcribe a YouTube URL directly.
    // Curator must paste a manual transcript via the ingestion form.
    throw new Error(
      'YouTube auto-captions are missing or too short. Phase 2 fallback: upload a manual transcript (VTT/SRT/txt). Audio extraction lands in Phase 5.',
    );
  }

  throw new Error('fetchTranscript requires one of: url, videoId, file, audioUrl');
}
