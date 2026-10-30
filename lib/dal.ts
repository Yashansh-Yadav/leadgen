import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type DashboardUser = { id: string; email: string | null };

// Data access layer: the only place that decides who is signed in and allowed.
// Every page and every Server Action calls requireDashboardUser() itself;
// the proxy's redirect is a convenience, not the security boundary.
export const getDashboardUser = cache(async (): Promise<DashboardUser | null | 'not_allowed'> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) return null;
  const { data: allowed, error } = await supabase.rpc('is_dashboard_user');
  if (error || allowed !== true) return 'not_allowed';
  return { id: sub, email: (data.claims.email as string | undefined) ?? null };
});

export async function requireDashboardUser(): Promise<DashboardUser> {
  const user = await getDashboardUser();
  if (user === null) redirect('/login');
  if (user === 'not_allowed') redirect('/not-authorized');
  return user;
}
