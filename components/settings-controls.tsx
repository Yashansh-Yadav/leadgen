'use client';

import { useActionState, useState, useTransition, type ReactNode } from 'react';
import { addCity, rescore, saveSettings, setCityActive, setRunner, type SettingsState } from '@/app/(app)/settings/actions';
import { BusyLabel, Spinner } from '@/components/loading';

const INITIAL: SettingsState = { ok: true, message: null };

function Message({ state }: { state: SettingsState | null }) {
  if (!state?.message) return null;
  return <p role="status" className={`text-sm ${state.ok ? 'text-good' : 'text-bad'}`}>{state.message}</p>;
}

/** A settings section: its inputs are server-rendered children; saving calls dash_update_config. */
export function SectionForm({ section, children }: { section: string; children: ReactNode }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings.bind(null, section), INITIAL);
  return (
    <form action={action} className="space-y-4">
      {children}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          <BusyLabel busy={pending} label="Save" busyLabel="Saving…" />
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function RunnerSwitch({ active }: { active: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<SettingsState | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" role="switch" aria-checked={active} disabled={pending}
              onClick={() => {
                if (active && !window.confirm('Stop all scheduled runs? Manual runs still work.')) return;
                start(async () => setState(await setRunner(!active)));
              }}
              className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${active ? 'bg-good' : 'bg-line'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${active ? 'left-6' : 'left-1'}`} />
      </button>
      <span className="inline-flex items-center gap-2 font-medium">
        {active ? 'Scheduled runs are ON' : 'Scheduled runs are OFF'}
        {pending && <><Spinner className="h-4 w-4 text-muted" /><span className="text-sm font-normal text-muted">{active ? 'Switching off…' : 'Switching on…'}</span></>}
      </span>
      <Message state={state} />
    </div>
  );
}

export function RescoreButton() {
  const [pending, start] = useTransition();
  const [state, setState] = useState<SettingsState | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={pending}
              onClick={() => start(async () => setState(await rescore()))}
              className="rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent disabled:opacity-50">
        <BusyLabel busy={pending} label="Re-score leads with these rules" busyLabel="Re-scoring…" />
      </button>
      <Message state={state} />
    </div>
  );
}

export function AddCityForm({ countries }: { countries: string[] }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(addCity, INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input name="country" list="known-countries" placeholder="Country" required
             className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm" />
      <datalist id="known-countries">{countries.map((c) => <option key={c} value={c} />)}</datalist>
      <input name="city" placeholder="City, e.g. Boise, ID" required
             className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm" />
      <button disabled={pending} className="rounded-lg border border-line px-3 py-1.5 text-sm disabled:opacity-50">
        <BusyLabel busy={pending} label="Add city" busyLabel="Adding…" />
      </button>
      <Message state={state} />
    </form>
  );
}

export function CityToggle({ id, active }: { id: number; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => { await setCityActive(id, !active); })}
            aria-pressed={active}
            className={`rounded-md px-2 py-0.5 text-xs disabled:opacity-50 ${active ? 'bg-good/15 text-good' : 'border border-line text-muted'}`}>
      <BusyLabel busy={pending} label={active ? 'Active' : 'Paused'} />
    </button>
  );
}
