'use server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function signInWithPassword(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; message?: string }> {
  const parsed = CredentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };
  redirect('/dashboard');
}

export async function signUp(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; message?: string }> {
  const parsed = CredentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' };

  const supabase = await createServerSupabaseClient();
  const origin =
    (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding/legal-gate` },
  });
  if (error) return { error: error.message };
  return {
    ok: true,
    message:
      'Account created — check your inbox to confirm, or sign in if email confirmation is disabled.',
  };
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient();
  const origin =
    (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback?next=/dashboard` },
  });

  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
  return { error: 'Could not start Google sign-in.' };
}
