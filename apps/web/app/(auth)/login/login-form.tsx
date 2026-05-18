'use client';
import { useActionState, useState } from 'react';
import { signInWithPassword, signUp, signInWithGoogle } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: { ok?: boolean; message?: string; error?: string } = {};

async function handleGoogleSignIn(_formData: FormData): Promise<void> {
  await signInWithGoogle();
}

export function LoginForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [signInState, signInAction, signInPending] = useActionState(signInWithPassword, initial);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initial);

  const isSignIn = mode === 'signin';
  const state = isSignIn ? signInState : signUpState;
  const action = isSignIn ? signInAction : signUpAction;
  const pending = isSignIn ? signInPending : signUpPending;

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            minLength={6}
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (isSignIn ? 'Signing in…' : 'Creating account…') : isSignIn ? 'Sign in' : 'Create account'}
        </Button>
        {state.error && (
          <p role="alert" className="text-sm text-red-600">{state.error}</p>
        )}
        {state.ok && (
          <p className="text-sm text-green-700">{state.message}</p>
        )}
      </form>

      <div className="text-center text-sm">
        {isSignIn ? (
          <>Don&apos;t have an account?{' '}
            <button type="button" onClick={() => setMode('signup')} className="underline">
              Create one
            </button>
          </>
        ) : (
          <>Already have an account?{' '}
            <button type="button" onClick={() => setMode('signin')} className="underline">
              Sign in
            </button>
          </>
        )}
      </div>

      <form action={handleGoogleSignIn}>
        <Button type="submit" variant="outline" className="w-full">
          Continue with Google
        </Button>
      </form>
    </div>
  );
}
