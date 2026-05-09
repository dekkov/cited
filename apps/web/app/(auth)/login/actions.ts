'use server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

const EmailSchema = z.object({ email: z.string().email() });

export async function signInWithMagicLink(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; message?: string }> {
  const parsed = EmailSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: 'Enter a valid email address.' };

  const supabase = await createServerSupabaseClient();
  const origin =
    (await headers()).get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
  });

  if (error) return { error: error.message };
  return { ok: true, message: 'Check your inbox — magic link sent.' };
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient();
  const origin =
    (await headers()).get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback?next=/dashboard` },
  });

  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
  return { error: 'Could not start Google sign-in.' };
}
