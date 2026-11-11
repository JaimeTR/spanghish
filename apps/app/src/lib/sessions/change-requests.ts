"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { requireArea } from "@/lib/require-area";
import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

function revalidateRequests(locale: string) {
  for (const area of ["student", "teacher", "admin"]) revalidatePath(`/${locale}/${area}`, "layout");
}

const newSchema = z.object({
  sessionId: z.uuid(),
  studentId: z.uuid(),
  kind: z.enum(["absence", "reschedule"]),
  note: z.string().trim().max(500).optional(),
});
export type NewRequestField = keyof z.input<typeof newSchema> & string;

/** El alumno avisa que no asistirá o pide cambiar una clase (la base comprueba clase futura y lista). */
export async function createChangeRequest(_prev: ActionState<NewRequestField>, formData: FormData): Promise<ActionState<NewRequestField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "student");
  const parsed = parseForm(newSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const v = parsed.data;
  const { error } = await (await createClient())
    .from("session_change_requests")
    .insert({ session_id: v.sessionId, student_id: v.studentId, kind: v.kind, note: v.note ?? null });
  if (error) return { status: "error", error: toDomainError(error) };
  revalidateRequests(locale);
  return { status: "ok" };
}

const idSchema = z.object({ id: z.uuid() });

/** El alumno cancela su solicitud mientras esté pendiente. */
export async function cancelChangeRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireArea(locale, "student");
  const parsed = parseForm(idSchema, formData);
  if (!parsed.ok) return { status: "error", error: "invalid" };
  const { data, error } = await (await createClient()).from("session_change_requests").update({ status: "cancelled" }).eq("id", parsed.data.id).select("id").maybeSingle();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data) return { status: "error", error: "not_found" };
  revalidateRequests(locale);
  return { status: "ok" };
}

const decideSchema = z.object({
  id: z.uuid(),
  decision: z.enum(["approved", "declined"]),
  responseNote: z.string().trim().max(500).optional(),
});
export type DecideField = keyof z.input<typeof decideSchema> & string;

/** La docente (o administración) aprueba o rechaza; quién y cuándo lo registra la base. */
export async function decideChangeRequest(_prev: ActionState<DecideField>, formData: FormData): Promise<ActionState<DecideField>> {
  const locale = actionLocale(formData);
  const user = await getSessionUser();
  await requireArea(locale, user?.roles.includes("admin") ? "admin" : "teacher");
  const parsed = parseForm(decideSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const { data, error } = await (await createClient())
    .from("session_change_requests")
    .update({ status: parsed.data.decision, response_note: parsed.data.responseNote ?? null })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data) return { status: "error", error: "not_found" };
  revalidateRequests(locale);
  return { status: "ok" };
}
