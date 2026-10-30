# LeadGen dashboard

The internal dashboard for the LeadGen Engine: a Next.js 16 app on top of the same Supabase database the n8n workflows use.

> Status: **D5** (login, Overview + live console, Leads + detail + actions, Outreach + call list, Settings). Still to come:
> D6 Vercel deploy.

## How access works
- You sign in with a **Supabase Auth** email and password.
- Signing in isn't enough: your user must also be listed in **`dashboard_users`**. Anyone else sees nothing, because every row-level-security policy is scoped to the organisations in that table (migration `003_dashboard.sql`).
- The dashboard **never writes to tables directly**. Every change goes through a checked database function (`dash_lead_action`, `dash_update_contact`, `dash_update_config`, `dash_rescore`), which verifies membership and only touches allowed fields. Pipeline functions such as `claim_leads` stay n8n-only.
- The browser only ever holds the **publishable** key. The service_role key belongs to n8n and must **never** go into this app.

## Setup
1. **Database:** in the Supabase SQL Editor, run `supabase/migrations/003_dashboard.sql`. It is safe to re-run. Re-run `002` first if it changed.
2. **Turn off public signups, but keep email sign-in on.** Both are on Authentication → Sign In / Providers:
   - **User Signups → "Allow new users to sign up": OFF.** Nobody can create an account on their own.
   - **Auth Providers → Email → "Enable Email provider": ON.** Without it, nobody can sign in at all (the error is `email_provider_disabled`).
3. **Create your user:** Authentication → Users → **Add user** → **Create new user** (email plus a strong password, with "Auto Confirm User" ticked).
4. **Give that user dashboard access** (SQL Editor):
   ```sql
   insert into dashboard_users (user_id, email)
   select id, email from auth.users where email = 'you@yourdomain.com';
   ```
5. **Environment:** copy `.env.example` to `.env.local` and fill in the values from Supabase → Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`: your project URL (the bare URL, without `/rest/v1/`)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the **publishable** key (`sb_publishable_…`). On older projects without one, use the anon key.
   - `NEXT_PUBLIC_N8N_BASE_URL`: your n8n address, used for audit-page links
6. Run it:
   ```bash
   cd dashboard
   npm install
   npm run dev        # http://localhost:3000
   ```

## Commands
| What | Command |
|---|---|
| Dev server | `npm run dev` |
| Production build (includes the type check) | `npm run build` |
| Lint | `npm run lint` (Next.js 16 no longer lints during the build) |

## Structure
```
proxy.ts               refreshes the session on every request, sends visitors to /login
lib/supabase/          browser client, server client, proxy session helper
lib/dal.ts             the only place that decides who is signed in and allowed (server-only)
app/login/             sign-in page + Server Action (no open redirects)
app/auth/signout/      POST → sign out
app/(app)/             signed-in area; its layout and every page call requireDashboardUser()
components/            shared UI (navigation)
```

## Notes
- **Next.js 16:** `middleware.ts` is now `proxy.ts`. `cookies()`, `params` and `searchParams` are async. Cache Components are **off** on purpose: every page is private and per-user, so nothing is cached between requests.
- Every Server Action checks the user again itself. The proxy redirect is a convenience, not the security boundary.
