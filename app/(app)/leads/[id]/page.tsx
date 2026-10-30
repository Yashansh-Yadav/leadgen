import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment, type ReactNode } from 'react';
import { requireDashboardUser } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { EmailBadge, StageBadge, StatusBadge, TierBadge } from '@/components/badges';
import { CopyButton } from '@/components/copy-button';
import { LeadActions } from '@/components/lead-actions';
import type { Lead } from '@/lib/types';
import { fmtNum, fmtTime } from '@/lib/format';

const SEVERITY: Record<string, string> = { high: 'bg-bad', medium: 'bg-warn', low: 'bg-muted' };
const yes = (v: unknown) => (v === true ? '✓ yes' : v === false ? '✗ no' : v == null ? '–' : String(v));

function Card({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>{actions}
      </div>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([k, v]) => (<Fragment key={k}><dt className="text-muted">{k}</dt><dd className="break-words">{v}</dd></Fragment>))}
    </dl>
  );
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireDashboardUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from('leads').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const l = data as Lead;

  const [{ data: logs }, { data: checks }, shot, { data: cfg }] = await Promise.all([
    supabase.from('run_logs').select('id, level, step, message, created_at')
      .filter('data->>lead_id', 'eq', l.id).order('created_at', { ascending: false }).limit(40),
    supabase.from('ai_visibility_checks').select('id, prompt_variant, prompt, answer_text, extracted, checked_at')
      .eq('country', l.country).eq('city', l.city).eq('niche', l.niche)
      .order('checked_at', { ascending: false }).limit(9),
    l.screenshot_path ? supabase.storage.from('screenshots').createSignedUrl(l.screenshot_path, 3600) : Promise.resolve(null),
    supabase.from('config').select('public_base_url').limit(1).maybeSingle(),
  ]);

  const ps = (l.audit?.pagespeed ?? null) as Record<string, unknown> | null;
  const html = (l.audit?.html ?? null) as Record<string, unknown> | null;
  const tags = (html?.tags ?? {}) as Record<string, boolean>;
  // Same source as the Outreach page and the digest (config.public_base_url); the env value is only a fallback.
  const base = (cfg?.public_base_url || process.env.NEXT_PUBLIC_N8N_BASE_URL || '').replace(/\/+$/, '');
  const auditUrl = l.audit_slug && base ? `${base}/webhook/audit?s=${l.audit_slug}` : null;
  const verification = (l.email_verification ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-5">
      <Link href="/leads" className="text-sm text-muted underline">← All leads</Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{l.company_name}</h1>
          <p className="text-sm text-muted">{l.niche} · {l.city}, {l.country}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StageBadge stage={l.pipeline_stage} /><TierBadge tier={l.tier} /><StatusBadge status={l.status} />
            {l.leak_score != null && <span className="text-xs text-muted">leak score <b className="text-ink">{l.leak_score}</b>/100</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {l.website && <a className="rounded-lg border border-line px-3 py-1.5" href={l.website} target="_blank" rel="noreferrer">Website ↗</a>}
          {l.google_maps_url && <a className="rounded-lg border border-line px-3 py-1.5" href={l.google_maps_url} target="_blank" rel="noreferrer">Google Maps ↗</a>}
          {auditUrl && <a className="rounded-lg border border-line px-3 py-1.5" href={auditUrl} target="_blank" rel="noreferrer">Audit page ↗</a>}
        </div>
      </header>

      {l.pipeline_stage === 'failed' && (
        <p className="rounded-lg border border-bad px-3 py-2 text-sm text-bad">
          Failed at <b>{l.failed_at_stage}</b> after {l.attempts} attempt(s): {l.last_error}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="What is costing them customers">
            {(l.issues ?? []).length === 0 ? <p className="text-sm text-muted">Not scored yet.</p> : (
              <ul className="space-y-2">
                {l.issues.map((i) => (
                  <li key={i.code} className="flex gap-3 text-sm">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY[i.severity] ?? 'bg-muted'}`} aria-hidden />
                    <span>{i.label} <span className="text-xs text-muted">({i.severity})</span></span>
                  </li>
                ))}
              </ul>
            )}
            {(l.fit_reasons ?? []).length > 0 && (
              <p className="mt-3 text-xs text-muted">
                Not pitched because: {l.fit_reasons.map((f) => `${f.rule}${f.value != null ? ` (${String(f.value)})` : ''}`).join(', ')}
              </p>
            )}
          </Card>

          <Card title="Pitch" actions={l.pitch_body ? <CopyButton text={`${l.pitch_subject}\n\n${l.pitch_body}`} label="Copy email" /> : null}>
            {!l.pitch_body ? <p className="text-sm text-muted">No pitch yet. Pitches are written once a lead has a contact.</p> : (
              <div className="space-y-3 text-sm">
                <p><span className="text-muted">Subject:</span> <b>{l.pitch_subject}</b></p>
                <pre className="whitespace-pre-wrap rounded-lg bg-bg p-3 font-sans">{l.pitch_body}</pre>
                {l.pitch_linkedin && (
                  <div className="flex items-start justify-between gap-2">
                    <p><span className="text-muted">LinkedIn:</span> {l.pitch_linkedin}</p>
                    <CopyButton text={l.pitch_linkedin} />
                  </div>
                )}
                {l.owner_email && (
                  <a className="inline-block rounded-lg bg-accent px-3 py-1.5 font-medium text-white"
                     href={`mailto:${encodeURIComponent(l.owner_email)}?subject=${encodeURIComponent(l.pitch_subject ?? '')}&body=${encodeURIComponent(l.pitch_body)}`}>
                    Open in my mail app
                  </a>
                )}
              </div>
            )}
          </Card>

          <Card title="Website audit">
            {l.audit?.no_website ? <p className="text-sm">No website on the Google listing.</p> : !l.audited_at ? (
              <p className="text-sm text-muted">Not audited yet.</p>
            ) : (
              <div className="grid gap-5 md:grid-cols-[1fr_auto]">
                <div className="space-y-4">
                  <Facts rows={[
                    ['Mobile score', ps?.performance_score != null ? `${ps.performance_score}/100` : `– ${String(l.audit?.pagespeed_error ?? '')}`],
                    ['Main content (LCP)', ps?.lcp_ms != null ? `${(Number(ps.lcp_ms) / 1000).toFixed(1)}s (${ps.lcp_source === 'field' ? 'real visitors' : 'lab test'})` : '–'],
                    ['Layout shift (CLS)', ps?.cls != null ? String(ps.cls) : '–'],
                    ['Responsiveness (INP)', ps?.inp_ms != null ? `${ps.inp_ms} ms` : '– (no real-visitor data)'],
                    ['HTTPS / mobile viewport', `${yes(ps?.https)} / ${yes(ps?.viewport_ok)}`],
                    ['SEO / best practices', `${ps?.seo_score ?? '–'} / ${ps?.best_practices_score ?? '–'}`],
                  ]} />
                  <Facts rows={[
                    ['Click-to-call link', yes(html?.has_tel_link)],
                    ['Contact form', yes(html?.has_form)],
                    ['Booking widget', String(html?.booking_widget ?? '–')],
                    ['Ad tags', Object.entries(tags).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'],
                    ['Conversion tracking', yes(html?.conversion_tracking)],
                    ['LocalBusiness schema', String(html?.local_business_schema ?? '–')],
                    ['Meta description', yes(html?.has_meta_description)],
                    ['Listing phone on page', yes(html?.nap_phone_on_page)],
                    ...(l.audit?.html_error ? [['HTML check', String(l.audit.html_error)] as [string, ReactNode]] : []),
                  ]} />
                </div>
                {shot && 'data' in shot && shot.data?.signedUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shot.data.signedUrl} alt={`${l.company_name} homepage on a phone`}
                       className="w-44 self-start rounded-2xl border-4 border-ink" />
                )}
              </div>
            )}
          </Card>

          <Card title="What AI assistants say">
            {l.ai_answers_total == null ? <p className="text-sm text-muted">Not checked yet.</p> : (
              <div className="space-y-3 text-sm">
                <p>
                  Named in <b>{l.ai_mentions ?? 0} of {l.ai_answers_total}</b> AI answers for {l.niche.toLowerCase()} in {l.city}.
                  {(l.ai_competitors ?? []).length > 0 && <> Named instead: {l.ai_competitors.map((c) => `${c.name} (${c.mentions}×)`).join(', ')}.</>}
                </p>
                {(checks ?? []).map((c) => {
                  const names = ((c.extracted as { businesses?: { name: string }[] } | null)?.businesses ?? []).map((b) => b.name);
                  return (
                    <details key={c.id} className="rounded-lg border border-line px-3 py-2">
                      <summary className="cursor-pointer">“{c.prompt}”</summary>
                      <p className="mt-2 text-xs text-muted">Recommended: {names.length ? names.join(' · ') : 'could not be read'}</p>
                      <p className="mt-2 whitespace-pre-wrap text-xs">{c.answer_text}</p>
                    </details>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Contact">
            <Facts rows={[
              ['Owner', l.owner_name ?? '–'],
              ['Email', l.owner_email ? <span key="e">{l.owner_email} <CopyButton text={l.owner_email} /></span> : '–'],
              ['Email status', <EmailBadge key="b" email={l.owner_email} verified={l.email_verified} source={l.email_source}
                                           status={String(verification.checked_status ?? verification.status ?? '')} />],
              ['Phone', l.phone ? <a key="p" className="underline" href={`tel:${l.phone}`}>{l.phone}</a> : '–'],
              ['Rating', l.rating != null ? `${l.rating} ★ (${fmtNum(l.review_count)} reviews)` : '–'],
              ['Google rank', l.search_rank != null ? `#${l.search_rank} for “${l.search_query}”` : '–'],
              ['Address', l.address ?? '–'],
            ]} />
          </Card>

          <Card title="Actions">
            <LeadActions leadId={l.id} stage={l.pipeline_stage} status={l.status}
                         hasEmail={Boolean(l.owner_email)} ownerName={l.owner_name} email={l.owner_email} />
          </Card>

          <Card title="History">
            {(logs ?? []).length === 0 ? <p className="text-sm text-muted">No log lines for this lead.</p> : (
              <ol className="space-y-2 text-xs">
                {logs!.map((g) => (
                  <li key={g.id}>
                    <span className="text-muted">{fmtTime(g.created_at)} · {g.step}</span>
                    <p className={g.level === 'error' ? 'text-bad' : g.level === 'warn' ? 'text-warn' : ''}>{g.message}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
