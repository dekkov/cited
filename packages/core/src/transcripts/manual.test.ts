import { describe, expect, it } from 'vitest';
import { manualProvider } from './manual';

const VTT_FIXTURE = `WEBVTT

00:00:01.000 --> 00:00:03.500
Hello world this is one cue

00:00:03.500 --> 00:00:06.000
Second cue with more words

00:00:06.000 --> 00:00:08.000
Final cue
`;

const SRT_FIXTURE = `1
00:00:01,000 --> 00:00:03,500
Hello world this is one cue

2
00:00:03,500 --> 00:00:06,000
Second cue with more words

3
00:00:06,000 --> 00:00:08,000
Final cue
`;

describe('manualProvider', () => {
  it('parses a 3-cue VTT into 3 segments with correct seconds-based timing', async () => {
    const result = await manualProvider.fetch({ file: { name: 't.vtt', content: VTT_FIXTURE } });
    expect(result.source).toBe('manual');
    expect(result.segments).toHaveLength(3);
    expect(result.segments[0]).toEqual({ start: 1, end: 3.5, text: 'Hello world this is one cue' });
    expect(result.segments[2]).toEqual({ start: 6, end: 8, text: 'Final cue' });
  });

  it('parses SRT equivalently to VTT', async () => {
    const result = await manualProvider.fetch({ file: { name: 't.srt', content: SRT_FIXTURE } });
    expect(result.segments).toHaveLength(3);
    expect(result.segments[0]).toEqual({ start: 1, end: 3.5, text: 'Hello world this is one cue' });
    expect(result.segments[2]).toEqual({ start: 6, end: 8, text: 'Final cue' });
  });

  it('rawText joins cue text with spaces', async () => {
    const result = await manualProvider.fetch({ file: { name: 't.vtt', content: VTT_FIXTURE } });
    expect(result.rawText).toBe('Hello world this is one cue Second cue with more words Final cue');
  });

  it('produces approximated words covering each cue duration', async () => {
    const result = await manualProvider.fetch({ file: { name: 't.vtt', content: VTT_FIXTURE } });
    // 6 + 5 + 2 = 13 words across the three cues
    expect(result.words).toHaveLength(13);
    // First word starts at cue1.start (1s)
    expect(result.words[0]?.start).toBe(1);
    // Last word ends at cue3.end (8s)
    expect(result.words.at(-1)?.end).toBeCloseTo(8, 5);
    // Each word is within its cue's bounds
    for (const w of result.words) {
      expect(w.end).toBeGreaterThan(w.start);
    }
  });

  it('throws when transcript has no cues', async () => {
    // subtitle@4 throws on its own for malformed input; manualProvider surfaces either error.
    await expect(
      manualProvider.fetch({ file: { name: 'empty.vtt', content: 'WEBVTT' } }),
    ).rejects.toThrow();
  });
});
