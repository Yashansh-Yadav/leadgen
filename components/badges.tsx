import { STAGES } from '@/lib/format';

const STAGE_LABEL: Record<string, string> = Object.fromEntries(
  [...STAGES.map((s) => [s.key, s.label]), ['parked', 'Parked'], ['failed', 'Failed']],
);

export function StageBadge({ stage }: { stage: string }) {
  const tone = stage === 'failed' ? 'border-bad text-bad' : stage === 'parked' ? 'border-line text-muted'
    : stage === 'pitched' || stage === 'pushed' ? 'border-good text-good' : 'border-line text-ink';
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${tone}`}>{STAGE_LABEL[stage] ?? stage}</span>;
}

/** Tier: text label first; the color only repeats it. */
export function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-xs text-muted">–</span>;
  const tone = tier === 'A' ? 'bg-accent text-white' : tier === 'B' ? 'border border-accent text-accent' : 'border border-line text-muted';
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${tone}`}>Tier {tier}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status === 'Replied' || status === 'Converted' ? 'text-good'
    : status === 'Do not contact' || status === 'Not interested' ? 'text-bad' : status === 'Contacted' ? 'text-accent' : 'text-muted';
  return <span className={`whitespace-nowrap text-xs font-medium ${tone}`}>{status}</span>;
}

export function EmailBadge({ email, verified, source, status }: {
  email: string | null; verified: boolean | null; source: string | null; status?: string | null;
}) {
  if (!email) return <span className="text-xs text-muted">no email</span>;
  if (verified) return <span className="text-xs text-good">✓ verified</span>;
  if (source === 'manual') return <span className="text-xs text-ink">✎ entered by hand</span>;
  return <span className="text-xs text-warn">⚠ not verified{status ? ` (${status})` : ''}</span>;
}
