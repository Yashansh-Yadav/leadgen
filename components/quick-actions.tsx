'use client';

import { useState, useTransition } from 'react';
import { leadAction } from '@/app/(app)/leads/actions';
import { BusyLabel } from '@/components/loading';

type QuickAction = { action: Parameters<typeof leadAction>[1]; label: string; primary?: boolean; confirm?: string };

/** A row of one-click outreach actions for list views (outreach queue, call list, follow-ups). */
export function QuickActions({ leadId, actions }: { leadId: string; actions: QuickAction[] }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <button key={a.action} type="button" disabled={pending}
                onClick={() => {
                  if (a.confirm && !window.confirm(a.confirm)) return;
                  setBusy(a.action);
                  start(async () => {
                    const r = await leadAction(leadId, a.action);
                    setMessage({ ok: r.ok, text: r.ok ? `${a.label} ✓` : r.message ?? 'Failed' });
                  });
                }}
                className={`rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 ${
                  a.primary ? 'bg-accent font-medium text-white'
                  : a.action === 'do_not_contact' ? 'border border-bad text-bad' : 'border border-line text-ink hover:border-accent'}`}>
          <BusyLabel busy={pending && busy === a.action} label={a.label} />
        </button>
      ))}
      {message && <span role="status" className={`text-xs ${message.ok ? 'text-good' : 'text-bad'}`}>{message.text}</span>}
    </div>
  );
}
