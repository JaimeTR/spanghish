"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function revalidate(locale: string) {
  for (const area of ["admin", "teacher", "student", "guardian"]) revalidatePath(`/${locale}/${area}`, "layout");
}

const closureSchema = z.object({
  startsOn: z.string().regex(DAY),
  endsOn: z.string().regex(DAY).optional(),
  locationId: z.uuid().optional(),
  reasonEs: z.string().trim().max(200).optional(),
  reasonEn: z.string().trim().max(200).optional(),
});
export type ClosureField = keyof z.input<typeof closureSchema> & string;

/** Agrega un cierre (festivo) y cancela las clases futuras sin asistencia que caen dentro. */
export async function addClosure(_prev: ActionState<ClosureField>, formData: FormData): Promise<ActionState<ClosureField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(closureSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const v = parsed.data;
  const ends = v.endsOn ?? v.startsOn;
  if (ends < v.startsOn) return { status: "invalid", fieldErrors: { endsOn: "range" } };
  const { error } = await (await createClient()).rpc("add_closure", {
    p_starts_on: v.startsOn,
    p_ends_on: ends,
    // null = cierre global; los tipos generados no admiten argumentos nulos.
    p_location_id: (v.locationId ?? null) as string,
    p_reason_es: v.reasonEs ?? "",
    p_reason_en: v.reasonEn ?? v.reasonEs ?? "",
  });
  if (error) return { status: "error", error: toDomainError(error) };
  revalidate(locale);
  return { status: "ok" };
}

const idSchema = z.object({ id: z.uuid() });

/** Quita un cierre (las clases que ya se cancelaron por él se reactivan a mano desde el calendario). */
export async function deleteClosure(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(idSchema, formData);
  if (!parsed.ok) return { status: "error", error: "invalid" };
  const { error } = await (await createClient()).from("closures").delete().eq("id", parsed.data.id);
  if (error) return { status: "error", error: toDomainError(error) };
  revalidate(locale);
  return { status: "ok" };
}
