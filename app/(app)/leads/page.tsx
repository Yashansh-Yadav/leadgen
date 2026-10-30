import Form from 'next/form';
import Link from 'next/link';
import { requireDashboardUser } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { SubmitButton } from '@/components/submit-button';
import { EmailBadge, StageBadge, StatusBadge, TierBadge } from '@/components/badges';
import { LEAK_LABELS, STAGES, fmtAgo, fmtNum } from '@/lib/format';

const PAGE_SIZE = 50;
const STATUSES = ['New', 'Contacted', 'Replied', 'Converted', 'Not interested', 'Do not contact'];
const SORTS = {
  score: { label: 'Highest leak score', column: 'leak_score', ascending: false },
  newest: { label: 'Newest', column: 'created_at', ascending: false },
  updated: { label: 'Recently changed', column: 'updated_at', ascending: false },
  rank: { label: 'Google rank', column: 'search_rank', ascending: true },
} as const;
// "Found" filter: rolling windows, so the result does not depend on the viewer's time zone.
const FOUND: Record<string, string> = { '1': 'Last 24 hours', '3': 'Last 3 days', '7': 'Last 7 days', '30': 'Last 30 days' };
const DAY_MS = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

type Search = { stage?: string; tier?: string; status?: string; city?: string; niche?: string; found?: string; q?: string; sort?: string; page?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireDashboardUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = SORTS[(sp.sort as keyof typeof SORTS) ?? 'score'] ?? SORTS.score;
  const supabase = await createClient();

  let query = supabase.from('leads')
    .select('id, company_name, niche, city, country, pipeline_stage, status, tier, leak_score, top_leak, rating, review_count, owner_email, email_verified, email_source, created_at, updated_at', { count: 'exact' })
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (sp.stage) query = query.eq('pipeline_stage', sp.stage);
  if (sp.tier) query = query.eq('tier', sp.tier);
  if (sp.status) query = query.eq('status', sp.status);
  if (sp.city) query = query.eq('city', sp.city);
  if (sp.niche) query = query.eq('niche', sp.niche);
  if (sp.found && FOUND[sp.found]) query = query.gte('created_at', daysAgo(Number(sp.found)));
  if (sp.q) query = query.ilike('company_name', `%${sp.q.replace(/[%_,()]/g, ' ')}%`);

  const freshSince = daysAgo(1);
  const countSince = (since: string) =>
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', since);
  const [{ data: leads, count, error }, { data: places }, { count: new24h }, { count: new7d }] = await Promise.all([
    query,
    supabase.from('leads').select('city, niche').limit(5000),
    countSince(freshSince),
    countSince(daysAgo(7)),
  ]);
  const freshMs = Date.parse(freshSince);
  const cities = [...new Set((places ?? []).map((p) => p.city))].sort();
  const niches = [...new Set((places ?? []).map((p) => p.niche))].sort();
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (patch: Partial<Search>) => {
    const next = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/leads?${next.toString()}`;
  };
  const select = 'rounded-lg border border-line bg-card px-2 py-1.5 text-sm';

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted">{fmtNum(total)} matching</p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm" aria-label="Recently found">
          <Link href={link({ found: '1', sort: 'newest', page: undefined })}
                className={`rounded-lg border px-3 py-1.5 ${sp.found === '1' ? 'border-accent text-accent' : 'border-line'}`}>
            New in last 24 h: <b className="tabular-nums">{fmtNum(new24h ?? 0)}</b>
          </Link>
          <Link href={link({ found: '7', sort: 'newest', page: undefined })}
                className={`rounded-lg border px-3 py-1.5 ${sp.found === '7' ? 'border-accent text-accent' : 'border-line'}`}>
            Last 7 days: <b className="tabular-nums">{fmtNum(new7d ?? 0)}</b>
          </Link>
        </nav>
      </header>

      <Form action="" className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-card p-3">
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Search company…" className={`${select} min-w-48 flex-1`} />
        <select name="stage" defaultValue={sp.stage ?? ''} className={select} aria-label="Stage">
          <option value="">All stages</option>
          {[...STAGES.map((s) => [s.key, s.label]), ['parked', 'Parked'], ['failed', 'Failed']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select name="tier" defaultValue={sp.tier ?? ''} className={select} aria-label="Tier">
          <option value="">All tiers</option>
          {['A', 'B', 'C'].map((t) => <option key={t} value={t}>Tier {t}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ''} className={select} aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select name="city" defaultValue={sp.city ?? ''} className={select} aria-label="City">
          <option value="">All cities</option>
          {cities.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select name="niche" defaultValue={sp.niche ?? ''} className={select} aria-label="Niche">
          <option value="">All niches</option>
          {niches.map((n) => <option key={n}>{n}</option>)}
        </select>
        <select name="found" defaultValue={sp.found ?? ''} className={select} aria-label="Found">
          <option value="">Found any time</option>
          {Object.entries(FOUND).map(([k, l]) => <option key={k} value={k}>Found: {l.toLowerCase()}</option>)}
        </select>
        <select name="sort" defaultValue={sp.sort ?? 'score'} className={select} aria-label="Sort">
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <SubmitButton label="Apply" busyLabel="Loading…" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white" />
        <Link href="/leads" className="px-2 py-1.5 text-sm text-muted underline">Reset</Link>
      </Form>

      {error && <p className="text-bad">Could not load leads: {error.message}</p>}

      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Business</th><th className="px-3 py-2">Stage</th><th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2 text-right">Score</th><th className="px-3 py-2">Top leak</th>
              <th className="px-3 py-2 text-right">Rating</th><th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Status</th><th className="px-3 py-2">Found</th><th className="px-3 py-2">Changed</th>
            </tr>
          </thead>
          <tbody>
            {(leads ?? []).length === 0 && <tr><td colSpan={10} className="px-3 py-6 text-center text-muted">No leads match these filters.</td></tr>}
            {(leads ?? []).map((l) => (
              <tr key={l.id} className="border-t border-line hover:bg-bg">
                <td className="px-3 py-2">
                  <Link href={`/leads/${l.id}`} className="font-medium text-ink hover:text-accent">{l.company_name}</Link>
                  <div className="text-xs text-muted">{l.niche} · {l.city}</div>
                </td>
                <td className="px-3 py-2"><StageBadge stage={l.pipeline_stage} /></td>
                <td className="px-3 py-2"><TierBadge tier={l.tier} /></td>
                <td className="px-3 py-2 text-right tabular-nums">{l.leak_score ?? '–'}</td>
                <td className="px-3 py-2 text-xs">{l.top_leak ? LEAK_LABELS[l.top_leak] ?? l.top_leak : '–'}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">{l.rating ?? '–'}{l.review_count != null ? ` (${fmtNum(l.review_count)})` : ''}</td>
                <td className="px-3 py-2"><EmailBadge email={l.owner_email} verified={l.email_verified} source={l.email_source} /></td>
                <td className="px-3 py-2"><StatusBadge status={l.status} /></td>
                <td className="px-3 py-2 text-xs text-muted whitespace-nowrap" title={l.created_at}>
                  {Date.parse(l.created_at) >= freshMs
                    ? <span className="rounded-md bg-accent/15 px-1.5 py-0.5 font-semibold text-accent">New</span>
                    : fmtAgo(l.created_at)}
                </td>
                <td className="px-3 py-2 text-xs text-muted" title={l.updated_at}>{fmtAgo(l.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pages">
          {page > 1 ? <Link className="underline" href={link({ page: String(page - 1) })}>← Previous</Link> : <span />}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link className="underline" href={link({ page: String(page + 1) })}>Next →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
