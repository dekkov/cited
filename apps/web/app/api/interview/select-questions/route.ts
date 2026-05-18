import { z } from 'zod';
import { selectQuestions } from '@cited/core';
import { getLlm } from '@cited/core';
import { getSessionUser } from '@/lib/auth/guards';

export const runtime = 'nodejs';
export const maxDuration = 30;

const RequestSchema = z.object({
  freeFormText: z.string().max(8000),
  count: z.number().int().min(1).max(12).optional(),
});

export async function POST(req: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = RequestSchema.parse(await req.json());

  const { selected, remaining } = await selectQuestions({
    llm: getLlm(),
    freeFormText: body.freeFormText,
    ...(body.count !== undefined ? { count: body.count } : {}),
  });

  return Response.json({ selected, remaining });
}
