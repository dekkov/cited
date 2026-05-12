/**
 * Extract the 11-character YouTube video ID from a URL or pass through a raw ID.
 * Accepts watch?v=, youtu.be/, /shorts/, /embed/ patterns. Throws on invalid input.
 */
export function extractVideoId(input: string): string {
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  const m =
    input.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    input.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    input.match(/\/shorts\/([A-Za-z0-9_-]{11})/) ||
    input.match(/\/embed\/([A-Za-z0-9_-]{11})/);
  if (!m) throw new Error(`Could not extract YouTube video ID from: ${input}`);
  // biome-ignore lint/style/noNonNullAssertion: regex group [1] guaranteed by successful match
  return m[1]!;
}

export type ApproxWord = {
  text: string;
  start: number;
  end: number;
};

/**
 * Approximate per-word timestamps by evenly splitting a segment's duration across its tokens.
 * Used when a transcript source only provides segment-level timing (YouTube captions, VTT/SRT cues).
 * Returns [] for empty input. Caller must supply end >= start (we clamp to a 1ms floor for safety).
 */
export function evenSplitWords(text: string, start: number, end: number): ApproxWord[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const duration = Math.max(end - start, 0.001);
  const per = duration / tokens.length;
  return tokens.map((t, i) => ({
    text: t,
    start: start + i * per,
    end: start + (i + 1) * per,
  }));
}
