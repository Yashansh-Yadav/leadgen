import type { ReactNode } from 'react';
import { fmtNum } from '@/lib/format';

/* Chart colors (validated with the dataviz palette validator, light + dark):
   one blue hue for single-series magnitude, an ordinal blue ramp for tiers. */

export function StatTile({ label, value, hint, tone }: {
  label: string; value: ReactNode; hint?: ReactNode; tone?: 'bad' | 'warn';
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-ink'}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export type Bar = { key: string; label: string; value: number; hint?: string; fill?: string };

/** Horizontal bars: a direct value label on every bar, a hover/focus tooltip, no legend. */
export function BarList({ bars, title, fill = 'var(--viz-series-1)' }: { bars: Bar[]; title: string; fill?: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <figure className="viz-root" aria-label={title}>
      <ul className="space-y-2">
        {bars.map((b) => (
          <li key={b.key} tabIndex={0} className="group relative grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3 outline-none">
            <span className="truncate text-sm text-ink">{b.label}</span>
            <span className="relative h-3.5 rounded-sm bg-[var(--viz-track)]">
              <span className="absolute inset-y-0 left-0 rounded-r-[4px]"
                    style={{ width: `${b.value === 0 ? 0 : Math.max(1.5, (b.value / max) * 100)}%`, background: b.fill ?? fill }} />
            </span>
            <span className="text-right text-sm tabular-nums text-ink">{fmtNum(b.value)}</span>
            <span role="tooltip"
                  className="pointer-events-none absolute left-32 top-full z-10 mt-1 hidden whitespace-nowrap rounded-md border border-line bg-card px-2 py-1 text-xs text-ink shadow-md group-hover:block group-focus:block">
              <b>{b.label}</b>: {fmtNum(b.value)}{b.hint ? ` · ${b.hint}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
