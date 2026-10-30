'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type LoginState = { error: string | null };

// Only relative paths inside the app are allowed after login (no open redirect).
function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === 'string' ? next : '';
  return value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email and password.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // the technical detail goes to the server log (your terminal), never to the page
    console.error(`[login] ${error.status ?? ''} ${error.code ?? ''}: ${error.message}`);
    switch (error.code) {
      case 'invalid_credentials':
        return { error: 'Email or password is wrong.' };
      case 'email_not_confirmed':
        return { error: 'This user is not confirmed yet. In Supabase → Authentication → Users, confirm it (or re-create it with "Auto Confirm User").' };
      case 'email_provider_disabled':
        return { error: 'Email sign-in is switched off in Supabase. Turn ON Authentication → Sign In / Providers → Email (keep "Allow new users to sign up" OFF).' };
      case 'user_banned':
        return { error: 'This user is blocked in Supabase.' };
      case 'over_request_rate_limit':
      case 'over_email_send_rate_limit':
        return { error: 'Too many attempts. Wait a minute and try again.' };
      default:
        return { error: `Sign-in failed (${error.code ?? error.status ?? 'unknown'}). The details are in the terminal running npm run dev.` };
    }
  }

  redirect(safeNext(formData.get('next')));
}
