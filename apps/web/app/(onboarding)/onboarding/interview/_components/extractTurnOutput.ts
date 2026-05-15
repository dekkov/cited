import type { UIMessage } from 'ai';
import { InterviewTurnOutputSchema } from '@cited/core';
import type { InterviewTurnOutput } from '@cited/core';

/**
 * Extracts a structured InterviewTurnOutput from the last assistant message.
 * AI SDK v6 emits content as a parts array; each text part may carry a JSON
 * payload matching InterviewTurnOutputSchema. We scan all text parts and return
 * the first one that parses correctly.
 */
export function extractTurnOutput(m: UIMessage | undefined): InterviewTurnOutput | null {
  if (!m) return null;
  for (const p of m.parts) {
    if (p.type === 'text') {
      const text = (p as { type: 'text'; text: string }).text;
      try {
        const parsed = JSON.parse(text);
        const result = InterviewTurnOutputSchema.safeParse(parsed);
        if (result.success) return result.data;
      } catch {
        // Not JSON — skip
      }
    }
  }
  return null;
}
