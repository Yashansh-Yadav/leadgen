import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Server client: one per request. Uses the visitor's session, so every query
// runs as that user and the database's row-level security applies.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component, which cannot set cookies.
            // The proxy refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}
