'use client';

import { useActionState, useState, useTransition } from 'react';
import { leadAction, updateContact, type ActionState } from '@/app/(app)/leads/actions';
import { BusyLabel } from '@/components/loading';

type Props = {
  leadId: string;
  stage: string;
  status: string;
  hasEmail: boolean;
  ownerName: string | null;
  email: string | null;
};

const BUTTONS: { action: Parameters<typeof leadAction>[1]; label: string; confirm?: string; show: (p: Props) => boolean }[] = [
  { action: 'contacted', label: 'Mark contacted', show: (p) => p.status === 'New' },
  { action: 'replied', label: 'Replied', show: (p) => ['New', 'Contacted'].includes(p.status) },
  { action: 'converted', label: 'Won', show: (p) => !['Converted', 'Do not contact'].includes(p.status) },
  { action: 'not_interested', label: 'Not interested', show: (p) => !['Not interested', 'Do not contact', 'Converted'].includes(p.status) },
  { action: 'bounced', label: 'Email bounced', show: (p) => p.hasEmail },
  { action: 'retry', label: 'Retry failed step', show: (p) => p.stage === 'failed' },
  { action: 'do_not_contact', label: 'Do not contact',
    confirm: 'Block this business for good? Its email and website domain go on the do-not-contact list.',
    show: (p) => p.status !== 'Do not contact' },
];

export function LeadActions(props: Props) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [contactState, saveContact, savingContact] = useActionState<ActionState, FormData>(
    updateContact.bind(null, props.leadId), { ok: true, message: null });

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Outreach</h3>
        <div className="flex flex-wrap gap-2">
          {BUTTONS.filter((b) => b.show(props)).map((b) => (
            <button key={b.action} type="button" disabled={pending}
                    onClick={() => {
                      if (b.confirm && !window.confirm(b.confirm)) return;
                      setBusy(b.action);
                      start(async () => setResult(await leadAction(props.leadId, b.action)));
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 ${
                      b.action === 'do_not_contact' ? 'border-bad text-bad' : 'border-line text-ink hover:border-accent'}`}>
              <BusyLabel busy={pending && busy === b.action} label={b.label} />
            </button>
          ))}
        </div>
        {result?.message && (
          <p role="status" className={`mt-2 text-xs ${result.ok ? 'text-good' : 'text-bad'}`}>{result.message}</p>
        )}
      </div>

      <form action={saveContact} className="space-y-2">
        <h3 className="text-sm font-semibold">Contact (entered by hand)</h3>
        <p className="text-xs text-muted">
          Saved as a manual contact: the contacts workflow never overwrites it. A good lead parked for having no email moves on to get a pitch.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="owner_name" defaultValue={props.ownerName ?? ''} placeholder="Owner name"
                 className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm" />
          <input name="email" type="email" defaultValue={props.email ?? ''} placeholder="owner@business.com"
                 className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm" />
        </div>
        <button type="submit" disabled={savingContact}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          <BusyLabel busy={savingContact} label="Save contact" busyLabel="Saving…" />
        </button>
        {contactState.message && (
          <p role="status" className={`text-xs ${contactState.ok ? 'text-good' : 'text-bad'}`}>{contactState.message}</p>
        )}
      </form>
    </div>
  );
}
