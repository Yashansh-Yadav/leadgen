import Link from 'next/link';
import { requireDashboardUser } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { EmailBadge, TierBadge } from '@/components/badges';
import { CopyButton } from '@/components/copy-button';
import { QuickActions } from '@/components/quick-actions';
import type { Competitor, Issue } from '@/lib/types';
import { LEAK_LABELS, fmtAgo, fmtNum } from '@/lib/format';

const TABS = [
  { key: 'email', label: 'Ready to email' },
  { key: 'call', label: 'Call list' },
  { key: 'waiting', label: 'Waiting for reply' },
] as const;
type Tab = (typeof TABS)[number]['key'];

const DNC = { action: 'do_not_contact' as const, label: 'Do not contact',
              confirm: 'Block this business for good? Its email and website domain go on the do-not-contact list.' };

function mailto(email: string, subject: string | null, body: string | null) {
  const full = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject ?? '')}&body=${encodeURIComponent(body ?? '')}`;
  return full.length <= 1900 ? full : `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject ?? '')}`;
}

function daysSince(iso: string | null) {
  return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;
}

export default async function OutreachPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireDashboardUser();
  const requested = (await searchParams).tab;
  const tab: Tab = TABS.find((t) => t.key === requested)?.key ?? 'email';
  const supabase = await createClient();

  const [emailQ, callQ, waitingQ] = await Promise.all([
    supabase.from('outreach_queue').select('*').order('tier').order('pitched_at'),
    supabase.from('call_queue').select('*').order('leak_score', { ascending: false, nullsFirst: false }),
    supabase.from('leads').select('id, company_name, city, niche, owner_name, owner_email, phone, tier, contacted_at, pitch_subject')
      .eq('status', 'Contacted').order('contacted_at', { ascending: true }),
  ]);
  const counts: Record<Tab, number> = { email: emailQ.data?.length ?? 0, call: callQ.data?.length ?? 0, waiting: waitingQ.data?.length ?? 0 };
  const error = emailQ.error ?? callQ.error ?? waitingQ.error;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Outreach</h1>
        <p className="text-sm text-muted">Send each pitch personally, one at a time, from your own mailbox. Mark it contacted afterwards.</p>
      </header>

      <nav className="flex gap-1 border-b border-line" aria-label="Outreach lists">
        {TABS.map((t) => (
          <Link key={t.key} href={`/outreach?tab=${t.key}`} aria-current={tab === t.key ? 'page' : undefined}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === t.key ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            {t.label} <span className="ml-1 rounded-full bg-line px-1.5 text-xs tabular-nums">{counts[t.key]}</span>
          </Link>
        ))}
      </nav>

      {error && <p className="text-bad">Could not load: {error.message}</p>}

      {tab === 'email' && (
        <ul className="space-y-3">
          {counts.email === 0 && <li className="rounded-xl border border-line bg-card p-6 text-center text-sm text-muted">Nothing to send right now. New pitches appear here after workflow 05 writes them.</li>}
          {(emailQ.data ?? []).map((l) => (
            <li key={l.id} className="rounded-xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/leads/${l.id}`} className="font-semibold hover:text-accent">{l.company_name}</Link>
                  <p className="text-xs text-muted">{l.niche} · {l.city}</p>
                </div>
                <div className="flex items-center gap-2"><TierBadge tier={l.tier} /><span className="text-xs text-muted">{l.top_leak ? LEAK_LABELS[l.top_leak] : ''}</span></div>
              </div>
              <p className="mt-3 text-sm">
                <span className="text-muted">To:</span> {l.owner_name ? `${l.owner_name} <${l.email}>` : l.email}{' '}
                <EmailBadge email={l.email} verified={l.email_status === 'verified'} source={l.email_source} />
              </p>
              {l.email_status === 'not_verified' && (
                <p className="mt-1 text-xs text-warn">⚠ This address could not be verified. Send carefully, and press &ldquo;Email bounced&rdquo; on the lead page if it bounces.</p>
              )}
              <p className="mt-2 text-sm"><span className="text-muted">Subject:</span> <b>{l.pitch_subject}</b></p>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-accent">Show email</summary>
                <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-bg p-3 font-sans text-sm">{l.pitch_body}</pre>
                {l.audit_url && <p className="mt-1 text-xs text-muted">Audit page: <a className="underline" href={l.audit_url} target="_blank" rel="noreferrer">{l.audit_url}</a></p>}
              </details>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a href={mailto(l.email, l.pitch_subject, l.pitch_body)} className="rounded-lg border border-line px-3 py-1.5 text-sm">Open in my mail app</a>
                <CopyButton text={`${l.pitch_subject}\n\n${l.pitch_body}`} label="Copy email" />
                <QuickActions leadId={l.id} actions={[{ action: 'contacted', label: 'Mark contacted', primary: true }, DNC]} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'call' && (
        <ul className="space-y-3">
          {counts.call === 0 && <li className="rounded-xl border border-line bg-card p-6 text-center text-sm text-muted">No call leads. Good Tier A/B leads without an email appear here.</li>}
          {(callQ.data ?? []).map((l) => {
            const points = ((l.issues ?? []) as Issue[]).filter((i) => i.severity !== 'low').slice(0, 3);
            const comps = ((l.ai_competitors ?? []) as Competitor[]).map((c) => c.name);
            return (
              <li key={l.id} className="rounded-xl border border-line bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link href={`/leads/${l.id}`} className="font-semibold hover:text-accent">{l.company_name}</Link>
                    <p className="text-xs text-muted">{l.niche} · {l.city} · {l.rating ?? '–'} ★ ({fmtNum(l.review_count)} reviews)</p>
                  </div>
                  <a href={`tel:${l.phone}`} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white">📞 {l.phone}</a>
                </div>
                <div className="mt-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Talking points</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {points.map((i) => <li key={i.code}>{i.label}</li>)}
                    {points.length === 0 && <li className="text-muted">See the lead page for details.</li>}
                  </ul>
                  {comps.length > 0 && <p className="mt-2 text-xs text-muted">AI assistants recommend instead: {comps.join(', ')}</p>}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <QuickActions leadId={l.id} actions={[
                    { action: 'contacted', label: 'Called', primary: true },
                    { action: 'replied', label: 'Interested' },
                    { action: 'not_interested', label: 'Not interested' },
                    DNC,
                  ]} />
                  <Link href={`/leads/${l.id}`} className="text-sm text-muted underline">Got an email? Add it on the lead page →</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'waiting' && (
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-3 py-2">Business</th><th className="px-3 py-2">Contacted</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Outcome</th></tr>
            </thead>
            <tbody>
              {counts.waiting === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-muted">Nobody is waiting for a reply.</td></tr>}
              {(waitingQ.data ?? []).map((l) => {
                const days = daysSince(l.contacted_at);
                return (
                  <tr key={l.id} className="border-t border-line align-top">
                    <td className="px-3 py-2">
                      <Link href={`/leads/${l.id}`} className="font-medium hover:text-accent">{l.company_name}</Link>
                      <div className="text-xs text-muted">{l.niche} · {l.city}{l.pitch_subject ? ` · “${l.pitch_subject}”` : ''}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {fmtAgo(l.contacted_at)}
                      {days != null && days >= 4 && <div className="text-xs text-warn">follow up?</div>}
                    </td>
                    <td className="px-3 py-2 text-xs">{l.owner_email ?? (l.phone ? <a className="underline" href={`tel:${l.phone}`}>{l.phone}</a> : '–')}</td>
                    <td className="px-3 py-2">
                      <QuickActions leadId={l.id} actions={[
                        { action: 'replied', label: 'Replied', primary: true },
                        { action: 'converted', label: 'Won' },
                        { action: 'not_interested', label: 'Not interested' },
                        ...(l.owner_email ? [{ action: 'bounced' as const, label: 'Bounced' }] : []),
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
