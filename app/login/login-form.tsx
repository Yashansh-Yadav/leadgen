'use client';

import { useActionState } from 'react';
import { login, type LoginState } from './actions';
import { BusyLabel } from '@/components/loading';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="text-sm font-medium text-ink">Email</span>
        <input name="email" type="email" autoComplete="email" required
               className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-ink outline-none focus:border-accent" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink">Password</span>
        <input name="password" type="password" autoComplete="current-password" required
               className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-ink outline-none focus:border-accent" />
      </label>
      {state.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <button type="submit" disabled={pending}
              className="w-full rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-60">
        <BusyLabel busy={pending} label="Sign in" busyLabel="Signing in…" />
      </button>
    </form>
  );
}
