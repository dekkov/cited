'use client';
import { useActionState } from 'react';
import { signInWithMagicLink, signInWithGoogle } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: { ok?: boolean; message?: string; error?: string } = {};

/** Wraps signInWithGoogle to match the void action signature expected by the form element */
async function handleGoogleSignIn(_formData: FormData): Promise<void> {
  await signInWithGoogle();
}

export function LoginForm() {
  const [state, action, pending] = useActionState(signInWithMagicLink, initial);
  return (
    <div className="space-y-6">
      <form action={action} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Sending…' : 'Send magic link'}
        </Button>
        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="text-sm text-green-700">{state.message}</p>
        )}
      </form>
      <form action={handleGoogleSignIn}>
        <Button type="submit" variant="outline" className="w-full">
          Continue with Google
        </Button>
      </form>
    </div>
  );
}
