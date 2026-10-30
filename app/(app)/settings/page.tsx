import type { ReactNode } from 'react';
import { requireDashboardUser } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { AddCityForm, CityToggle, RescoreButton, RunnerSwitch, SectionForm } from '@/components/settings-controls';
import { LEAK_LABELS, fmtAgo } from '@/lib/format';

type Config = {
  runner_active: boolean;
  target_countries: string[];
  selected_niches: string[];
  cities_per_country: number;
  pages_per_query: number;
  scoring_weights: Record<string, number>;
  tier_thresholds: { A: number; B: number };
  fit_rules: { min_rating?: number; min_reviews?: number; max_reviews?: number; chain_min_cities?: number };
  high_value_niches: string[];
  email_outreach_countries: string[];
  ai_visibility_ttl_days: number;
  booking_cta_url: string | null;
  sender_signature: { name?: string; company?: string; address?: string };
  public_base_url: string | null;
};

const input = 'w-full rounded-lg border border-line bg-card px-3 py-1.5 text-sm';

function Section({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-card p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-4 mt-1 text-sm text-muted">{intro}</p>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export default async function SettingsPage() {
  await requireDashboardUser();
  const supabase = await createClient();
  const [{ data: cfg, error }, { data: cities }] = await Promise.all([
    supabase.from('config').select('*').limit(1).maybeSingle(),
    supabase.from('target_cities').select('id, country, city, active, last_searched_at').order('country').order('city'),
  ]);
  if (error || !cfg) return <p className="text-bad">Could not load settings: {error?.message ?? 'no config row'}</p>;
  const c = cfg as Config;
  const knownCountries = [...new Set([...(cities ?? []).map((x) => x.country), ...c.target_countries])].sort();

  return (
    <div className="max-w-4xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">Changes apply to the next workflow run. Every change is written to the live console.</p>
      </header>

      <Section title="Automation" intro="The master switch for every scheduled workflow. When it is off, scheduled runs are skipped (and logged); manual runs from n8n still work.">
        <RunnerSwitch active={c.runner_active} />
      </Section>

      <Section title="What to search" intro="Discovery searches Google for each niche in the least recently searched cities of each country, once a day.">
        <SectionForm section="search">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Countries" hint="One per line or comma-separated. Must match the country names of your cities.">
              <textarea name="target_countries" rows={3} defaultValue={c.target_countries.join('\n')} className={input} />
            </Field>
            <Field label="Niches" hint="As people search for them, e.g. Plumbers, Roofers, Dentists.">
              <textarea name="selected_niches" rows={3} defaultValue={c.selected_niches.join('\n')} className={input} />
            </Field>
            <Field label="Cities per country per day" hint="1–50. Each city × niche costs one Google Places request per page.">
              <input name="cities_per_country" type="number" min={1} max={50} required defaultValue={c.cities_per_country} className={input} />
            </Field>
            <Field label="Result pages per search" hint="1–3 (20 results each). Pages 2–3 reach smaller, owner-run businesses.">
              <input name="pages_per_query" type="number" min={1} max={3} required defaultValue={c.pages_per_query} className={input} />
            </Field>
          </div>
        </SectionForm>

        <div className="mt-6 border-t border-line pt-4">
          <h3 className="mb-2 text-sm font-semibold">Cities</h3>
          <AddCityForm countries={knownCountries} />
          <div className="mt-3 max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr><th className="py-1.5">City</th><th className="py-1.5">Country</th><th className="py-1.5">Last searched</th><th className="py-1.5">Status</th></tr>
              </thead>
              <tbody>
                {(cities ?? []).map((x) => (
                  <tr key={x.id} className="border-t border-line">
                    <td className="py-1.5">{x.city}</td>
                    <td className="py-1.5 text-muted">{x.country}</td>
                    <td className="py-1.5 text-xs text-muted">{x.last_searched_at ? fmtAgo(x.last_searched_at) : 'never'}</td>
                    <td className="py-1.5"><CityToggle id={x.id} active={x.active} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section title="Scoring" intro="Each leak adds its points (max 100). Tier A and B leads go on to contacts and pitches; Tier C and leads that fail the fit rules are parked.">
        <SectionForm section="scoring">
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(LEAK_LABELS).map(([k, label]) => (
              <Field key={k} label={label}>
                <input name={`w_${k}`} type="number" min={0} max={100} required defaultValue={c.scoring_weights[k] ?? 0} className={input} />
              </Field>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tier A from score" hint="Must be at least the Tier B score.">
              <input name="tier_a" type="number" min={0} max={100} required defaultValue={c.tier_thresholds.A} className={input} />
            </Field>
            <Field label="Tier B from score">
              <input name="tier_b" type="number" min={0} max={100} required defaultValue={c.tier_thresholds.B} className={input} />
            </Field>
          </div>
          <h3 className="pt-2 text-sm font-semibold">Fit rules: who is worth pitching</h3>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Min. rating"><input name="min_rating" type="number" step="0.1" min={0} max={5} defaultValue={c.fit_rules.min_rating ?? ''} className={input} /></Field>
            <Field label="Min. reviews"><input name="min_reviews" type="number" min={0} defaultValue={c.fit_rules.min_reviews ?? ''} className={input} /></Field>
            <Field label="Max. reviews" hint="Empty = no limit."><input name="max_reviews" type="number" min={0} defaultValue={c.fit_rules.max_reviews ?? ''} className={input} /></Field>
            <Field label="Chain from cities"><input name="chain_min_cities" type="number" min={2} defaultValue={c.fit_rules.chain_min_cities ?? ''} className={input} /></Field>
          </div>
        </SectionForm>
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2 text-sm text-muted">New rules apply to newly scored leads. To apply them to existing leads that have not reached contacts yet (no Hunter credits are spent twice):</p>
          <RescoreButton />
        </div>
      </Section>

      <Section title="Outreach and sender" intro="Who may be emailed, and what the pitches and audit pages show about you.">
        <SectionForm section="outreach">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Countries you may email" hint="Only these reach the outreach list. EU countries are excluded by default (consent rules).">
              <textarea name="email_outreach_countries" rows={3} defaultValue={c.email_outreach_countries.join('\n')} className={input} />
            </Field>
            <Field label="Priority niches" hint="Processed first; does not change the score.">
              <textarea name="high_value_niches" rows={3} defaultValue={c.high_value_niches.join('\n')} className={input} />
            </Field>
            <Field label="Your name"><input name="sig_name" defaultValue={c.sender_signature.name ?? ''} className={input} /></Field>
            <Field label="Company"><input name="sig_company" defaultValue={c.sender_signature.company ?? ''} className={input} /></Field>
            <Field label="Address" hint="Shown in every email signature and on audit pages.">
              <input name="sig_address" defaultValue={c.sender_signature.address ?? ''} className={input} />
            </Field>
            <Field label="Booking link" hint="Optional. Adds a “Book a walkthrough” button to audit pages.">
              <input name="booking_cta_url" type="url" defaultValue={c.booking_cta_url ?? ''} className={input} />
            </Field>
            <Field label="n8n address" hint="e.g. https://NAME.app.n8n.cloud, for audit links.">
              <input name="public_base_url" type="url" defaultValue={c.public_base_url ?? ''} className={input} />
            </Field>
            <Field label="Reuse AI answers for (days)" hint="1–365. Each city × niche is re-checked at most this often.">
              <input name="ai_visibility_ttl_days" type="number" min={1} max={365} required defaultValue={c.ai_visibility_ttl_days} className={input} />
            </Field>
          </div>
        </SectionForm>
      </Section>
    </div>
  );
}
