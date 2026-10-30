import Link from 'next/link';
import { requireDashboardUser } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { BarList, StatTile, type Bar } from '@/components/charts';
import { LiveConsole, type LogRow } from '@/components/live-console';
import { STAGES, WORKFLOW_LABELS, fmtAgo, fmtDuration, fmtNum, fmtUsd } from '@/lib/format';

type Overview = {
  stages: Record<string, number>;
  tiers: Record<string, number>;
  statuses: Record<string, number>;
  leads_total: number;
  leads_7d: number;
  outreach_ready: number;
  call_ready: number;
  failed: number;
  errors_24h: number;
  openai_usd_30d: number;
  hunter_checks_30d: number;
  audit_views_30d: number;
  runner_active: boolean;
  last_runs: { workflow: string; status: string; trigger: string; started_at: string; finished_at: string | null; stats: Record<string, unknown> }[];
};

const RUN_STATUS: Record<string, string> = {
  completed: 'text-good', running: 'text-accent', failed: 'text-bad', skipped: 'text-muted',
};

export default async function OverviewPage() {
  await requireDashboardUser();
  const supabase = await createClient();
  const [{ data: overview, error }, { data: logs }] = await Promise.all([
    supabase.rpc('dash_overview'),
    supabase.from('run_logs').select('id, run_id, level, step, message, created_at')
      .order('created_at', { ascending: false }).limit(60),
  ]);

  if (error || !overview) {
    return <p className="text-bad">Could not load the overview: {error?.message ?? 'no data'}</p>;
  }
  const o = overview as Overview;
  const funnel: Bar[] = STAGES.map((s) => ({ key: s.key, label: s.label, value: o.stages[s.key] ?? 0, hint: s.hint }));
  const tiers: Bar[] = (['A', 'B', 'C'] as const).map((t) => ({
    key: t, label: `Tier ${t}`, value: o.tiers[t] ?? 0, fill: `var(--viz-tier-${t.toLowerCase()})`,
    hint: t === 'C' ? 'parked: weak fit or few leaks' : 'worth pitching',
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-muted">{fmtNum(o.leads_total)} leads · {fmtNum(o.leads_7d)} new in the last 7 days</p>
        </div>
        <Link href="/settings"
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${o.runner_active ? 'border-good text-good' : 'border-line text-muted'}`}>
          <span aria-hidden>{o.runner_active ? '●' : '○'}</span>
          Scheduled runs {o.runner_active ? 'on' : 'off'}
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Key numbers">
        <StatTile label="Ready to email" value={fmtNum(o.outreach_ready)} hint={<Link className="underline" href="/outreach">Open outreach</Link>} />
        <StatTile label="Ready to call" value={fmtNum(o.call_ready)} hint="good leads without email" />
        <StatTile label="Failed leads" value={fmtNum(o.failed)} tone={o.failed ? 'warn' : undefined}
                  hint={o.failed ? <Link className="underline" href="/leads?stage=failed">Review and retry</Link> : 'retried automatically up to 3×'} />
        <StatTile label="Errors (24 h)" value={fmtNum(o.errors_24h)} tone={o.errors_24h ? 'bad' : undefined} hint="see the live console" />
        <StatTile label="OpenAI spend (30 d)" value={fmtUsd(o.openai_usd_30d)} hint="AI visibility checks" />
        <StatTile label="Hunter checks (30 d)" value={fmtNum(o.hunter_checks_30d)} hint="email verifications" />
        <StatTile label="Audit page views (30 d)" value={fmtNum(o.audit_views_30d)} hint="prospects opening their audit" />
        <StatTile label="Replies" value={fmtNum(o.statuses.Replied ?? 0)}
                  hint={`${fmtNum(o.statuses.Contacted ?? 0)} contacted · ${fmtNum(o.statuses.Converted ?? 0)} won`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-line bg-card p-4 lg:col-span-2">
          <h2 className="font-semibold">Pipeline</h2>
          <p className="mb-4 text-xs text-muted">
            Leads currently in each stage · also {fmtNum(o.stages.parked ?? 0)} parked and {fmtNum(o.stages.failed ?? 0)} failed
          </p>
          <BarList title="Leads per pipeline stage" bars={funnel} />
        </section>
        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="font-semibold">Tiers</h2>
          <p className="mb-4 text-xs text-muted">All scored leads</p>
          <BarList title="Scored leads per tier" bars={tiers} />
        </section>
      </div>

      <section className="rounded-xl border border-line bg-card">
        <h2 className="border-b border-line px-4 py-3 font-semibold">Last run per workflow</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-2">Workflow</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Started</th><th className="px-4 py-2">Took</th><th className="px-4 py-2">Trigger</th></tr>
            </thead>
            <tbody>
              {o.last_runs.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-muted">No runs yet.</td></tr>}
              {o.last_runs.map((r) => (
                <tr key={r.workflow} className="border-t border-line">
                  <td className="px-4 py-2">{WORKFLOW_LABELS[r.workflow] ?? r.workflow}</td>
                  <td className={`px-4 py-2 font-medium ${RUN_STATUS[r.status] ?? ''}`}>{r.status}</td>
                  <td className="px-4 py-2 text-muted" title={r.started_at}>{fmtAgo(r.started_at)}</td>
                  <td className="px-4 py-2 tabular-nums text-muted">{fmtDuration(r.started_at, r.finished_at)}</td>
                  <td className="px-4 py-2 text-muted">{r.trigger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <LiveConsole initial={(logs ?? []) as LogRow[]} />
    </div>
  );
}
