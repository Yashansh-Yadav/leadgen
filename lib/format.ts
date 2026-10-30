export const STAGES = [
  { key: 'discovered', label: 'Discovered', hint: 'found on Google Places' },
  { key: 'audited', label: 'Audited', hint: 'website checked' },
  { key: 'ai_checked', label: 'AI checked', hint: 'AI visibility measured' },
  { key: 'scored', label: 'Scored A/B', hint: 'worth pitching, waiting for a contact' },
  { key: 'enriched', label: 'Contact found', hint: 'email ready, waiting for a pitch' },
  { key: 'pitched', label: 'Pitched', hint: 'pitch written, ready to send' },
  { key: 'pushed', label: 'Pushed', hint: 'sent to Instantly' },
] as const;

export const WORKFLOW_LABELS: Record<string, string> = {
  discovery: '01 Discovery',
  audit: '02 Audit',
  ai_visibility: '03 AI visibility',
  contacts: '04 Contacts',
  score_and_pitch: '05 Score & pitch',
  outreach_digest: '08 Digest',
};

export const LEAK_LABELS: Record<string, string> = {
  ads_on_weak_page: 'Ads on a weak page',
  ai_invisible: 'Invisible to AI',
  no_website: 'No website',
  mobile_perf_poor: 'Slow mobile site',
  conversion_gap: 'Conversion gap',
  local_rank_low: 'Low Google rank',
};

const num = new Intl.NumberFormat('en-US');
export const fmtNum = (n: number | null | undefined) => (n == null ? '–' : num.format(n));
export const fmtUsd = (n: number | null | undefined) =>
  n == null ? '–' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export function fmtAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '–';
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function fmtDuration(start: string | null, end: string | null): string {
  if (!start || !end) return '–';
  const s = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}
