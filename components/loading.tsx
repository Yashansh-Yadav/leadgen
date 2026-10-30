import type { ReactNode } from 'react';

/** Small inline spinner; inherits the text color. */
export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Button content while an action runs: spinner + "busy" label, otherwise the label. */
export function BusyLabel({ busy, label, busyLabel }: { busy: boolean; label: ReactNode; busyLabel?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {busy && <Spinner className="h-3.5 w-3.5" />}
      {busy ? (busyLabel ?? label) : label}
    </span>
  );
}

/** Grey placeholder block for page skeletons. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-line ${className}`} aria-hidden />;
}

/** Page-level skeleton frame: title, optional subtitle, then the given blocks. */
export function PageSkeleton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading {label}…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      {children}
    </div>
  );
}

/** Table placeholder: a header row and n body rows. */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-xl border border-line bg-card p-4">
      <Skeleton className="h-4 w-full opacity-60" />
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}
    </div>
  );
}
