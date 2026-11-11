"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";

import { LEAD_STATUSES } from "@/lib/lead-status";

const leadSchema = z.object({
  id: z.uuid(),
  status: z.enum(LEAD_STATUSES),
  adminNotes: z.string().trim().max(2000).optional(),
});
export type LeadField = keyof z.input<typeof leadSchema> & string;

/** Estado y notas internas de una solicitud (solo administración; RLS lo repite). */
export async function saveLead(_prev: ActionState<LeadField>, formData: FormData): Promise<ActionState<LeadField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(leadSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const { id, status, adminNotes } = parsed.data;
  const { data, error } = await (await createClient())
    .from("leads")
    .update({ status, admin_notes: adminNotes ?? null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data) return { status: "error", error: "not_found" };
  revalidatePath(`/${locale}/admin/leads`);
  return { status: "ok" };
}
