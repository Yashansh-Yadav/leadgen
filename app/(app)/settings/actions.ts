'use server';

import { revalidatePath } from 'next/cache';
import { requireDashboardUser } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';

export type SettingsState = { ok: boolean; message: string | null };

const list = (v: FormDataEntryValue | null) =>
  String(v ?? '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  return s === '' ? null : Number(s);
};

// One section of the form → one validated patch for dash_update_config.
function patchFor(section: string, f: FormData): Record<string, unknown> {
  switch (section) {
    case 'search':
      return {
        target_countries: list(f.get('target_countries')),
        selected_niches: list(f.get('selected_niches')),
        cities_per_country: num(f.get('cities_per_country')),
        pages_per_query: num(f.get('pages_per_query')),
      };
    case 'scoring':
      return {
        scoring_weights: Object.fromEntries(
          ['ads_on_weak_page', 'ai_invisible', 'no_website', 'mobile_perf_poor', 'conversion_gap', 'local_rank_low']
            .map((k) => [k, num(f.get(`w_${k}`)) ?? 0])),
        tier_thresholds: { A: num(f.get('tier_a')), B: num(f.get('tier_b')) },
        fit_rules: {
          min_rating: num(f.get('min_rating')),
          min_reviews: num(f.get('min_reviews')),
          max_reviews: num(f.get('max_reviews')),          // empty = no upper limit
          chain_min_cities: num(f.get('chain_min_cities')),
        },
      };
    case 'outreach':
      return {
        email_outreach_countries: list(f.get('email_outreach_countries')),
        high_value_niches: list(f.get('high_value_niches')),
        ai_visibility_ttl_days: num(f.get('ai_visibility_ttl_days')),
        sender_signature: Object.fromEntries(
          ['name', 'company', 'address'].map((k) => [k, String(f.get(`sig_${k}`) ?? '').trim()]).filter(([, v]) => v)),
        booking_cta_url: String(f.get('booking_cta_url') ?? ''),
        public_base_url: String(f.get('public_base_url') ?? ''),
      };
    default:
      throw new Error('unknown section');
  }
}

async function apply(patch: Record<string, unknown>): Promise<SettingsState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('dash_update_config', { p_patch: patch });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/settings');
  revalidatePath('/');
  return { ok: true, message: 'Saved.' };
}

export async function saveSettings(section: string, _prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireDashboardUser();
  try {
    return await apply(patchFor(section, formData));
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function setRunner(active: boolean): Promise<SettingsState> {
  await requireDashboardUser();
  return apply({ runner_active: active });
}

export async function rescore(): Promise<SettingsState> {
  await requireDashboardUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('dash_rescore');
  if (error) return { ok: false, message: error.message };
  revalidatePath('/', 'layout');
  const r = data as { reset: number; tier_a: number; tier_b: number; tier_c: number };
  return { ok: true, message: `Re-scored ${r.reset} leads: ${r.tier_a} A, ${r.tier_b} B, ${r.tier_c} C.` };
}

// Target cities: row-level security limits these to the user's organization.
export async function addCity(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireDashboardUser();
  const country = String(formData.get('country') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim();
  if (!country || !city) return { ok: false, message: 'Enter a country and a city.' };
  const supabase = await createClient();
  const { error } = await supabase.from('target_cities').insert({ country, city });
  if (error) return { ok: false, message: error.code === '23505' ? 'That city is already in the list.' : error.message };
  revalidatePath('/settings');
  return { ok: true, message: `${city} added.` };
}

export async function setCityActive(id: number, active: boolean): Promise<SettingsState> {
  await requireDashboardUser();
  const supabase = await createClient();
  const { error } = await supabase.from('target_cities').update({ active }).eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/settings');
  return { ok: true, message: null };
}
