'use server';

import { revalidatePath } from 'next/cache';
import { requireDashboardUser } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';

export type ActionState = { ok: boolean; message: string | null };

const ACTIONS = ['contacted', 'replied', 'converted', 'not_interested', 'do_not_contact', 'bounced', 'retry'] as const;
type LeadAction = (typeof ACTIONS)[number];

// Each action re-checks the user here; the database function checks again
// (membership of the lead's organization) before changing anything.
export async function leadAction(leadId: string, action: LeadAction, note?: string): Promise<ActionState> {
  await requireDashboardUser();
  if (!ACTIONS.includes(action)) return { ok: false, message: 'Unknown action.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('dash_lead_action', { p_lead_id: leadId, p_action: action, p_note: note ?? null });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/leads');
  revalidatePath('/');
  return { ok: true, message: 'Saved.' };
}

export async function updateContact(leadId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireDashboardUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc('dash_update_contact', {
    p_lead_id: leadId,
    p_owner_name: String(formData.get('owner_name') ?? ''),
    p_email: String(formData.get('email') ?? ''),
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/leads');
  return { ok: true, message: 'Contact saved.' };
}
