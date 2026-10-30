'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fmtTime } from '@/lib/format';

export type LogRow = {
  id: number;
  run_id: string | null;
  level: 'info' | 'warn' | 'error';
  step: string;
  message: string;
  created_at: string;
};

const MAX_ROWS = 200;
const LEVELS = ['all', 'warn', 'error'] as const;
const LEVEL_STYLE: Record<LogRow['level'], string> = {
  info: 'text-muted',
  warn: 'text-warn',
  error: 'text-bad',
};

/** Recent run_logs plus new lines as they are written (Supabase Realtime; RLS applies). */
export function LiveConsole({ initial }: { initial: LogRow[] }) {
  const [rows, setRows] = useState<LogRow[]>(initial);
  const [filter, setFilter] = useState<(typeof LEVELS)[number]>('all');
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');

  useEffect(() => {
    if (paused) return;
    const supabase = createClient();
    const channel = supabase
      .channel('run-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'run_logs' }, (payload) => {
        const row = payload.new as LogRow;
        setRows((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev].slice(0, MAX_ROWS)));
      })
      .subscribe((s) => setStatus(s === 'SUBSCRIBED' ? 'live' : s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' ? 'offline' : 'connecting'));
    return () => {
      supabase.removeChannel(channel);
    };
  }, [paused]);

  const visible = useMemo(
    () => rows.filter((r) => filter === 'all' || (filter === 'warn' ? r.level !== 'info' : r.level === 'error')),
    [rows, filter],
  );

  return (
    <section className="rounded-xl border border-line bg-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <h2 className="mr-auto font-semibold">Live console</h2>
        <span className="flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
          <span className={`inline-block h-2 w-2 rounded-full ${paused ? 'bg-muted' : status === 'live' ? 'bg-good' : status === 'offline' ? 'bg-bad' : 'bg-warn'}`} />
          {paused ? 'Paused' : status === 'live' ? 'Live' : status === 'offline' ? 'Offline' : 'Connecting…'}
        </span>
        {LEVELS.map((l) => (
          <button key={l} onClick={() => setFilter(l)}
                  className={`rounded-md px-2 py-1 text-xs ${filter === l ? 'bg-accent text-white' : 'border border-line text-muted'}`}>
            {l === 'all' ? 'All' : l === 'warn' ? 'Warnings+' : 'Errors'}
          </button>
        ))}
        <button onClick={() => setPaused((p) => !p)} className="rounded-md border border-line px-2 py-1 text-xs text-muted">
          {paused ? 'Resume' : 'Pause'}
        </button>
      </header>
      <ol className="max-h-[28rem] overflow-y-auto px-4 py-2 font-mono text-xs leading-relaxed">
        {visible.length === 0 && <li className="py-6 text-center text-muted">No log lines yet.</li>}
        {visible.map((r) => (
          <li key={r.id} className="grid grid-cols-[7.5rem_7.5rem_1fr] gap-2 border-b border-line/60 py-1.5 last:border-0">
            <time className="text-muted" dateTime={r.created_at}>{fmtTime(r.created_at)}</time>
            <span className={`${LEVEL_STYLE[r.level]} truncate`}>
              {r.level === 'info' ? '' : r.level === 'warn' ? '⚠ ' : '✖ '}{r.step}
            </span>
            <span className={r.level === 'info' ? 'text-ink' : LEVEL_STYLE[r.level]}>{r.message}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
