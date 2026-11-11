"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { requireArea } from "@/lib/require-area";
import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const STATUSES = ["present", "late", "absent", "excused"] as const;

/** Administración o docente (la base repite el control con RLS: la docente solo toca sus clases). */
async function requireStaff(locale: ReturnType<typeof actionLocale>) {
  const user = await getSessionUser();
  await requireArea(locale, user?.roles.includes("admin") ? "admin" : "teacher");
}

function revalidateClasses(locale: string) {
  for (const area of ["admin", "teacher", "student"]) revalidatePath(`/${locale}/${area}`, "layout");
}

const markSchema = z.object({ sessionId: z.uuid(), studentId: z.uuid(), status: z.enum(STATUSES) });

/** Marca la asistencia de un alumno. Pulsar de nuevo el mismo estado la quita. */
export async function markAttendance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireStaff(locale);
  const parsed = parseForm(markSchema, formData);
  if (!parsed.ok) return { status: "error", error: "invalid" };
  const { sessionId, studentId, status } = parsed.data;
  const supabase = await createClient();

  const existing = await supabase.from("attendance").select("id, status").eq("session_id", sessionId).eq("student_id", studentId).maybeSingle();
  if (existing.error) return { status: "error", error: toDomainError(existing.error) };

  const result = !existing.data
    ? await supabase.from("attendance").insert({ session_id: sessionId, student_id: studentId, status })
    : existing.data.status === status
      ? await supabase.from("attendance").delete().eq("id", existing.data.id)
      : await supabase.from("attendance").update({ status }).eq("id", existing.data.id);
  if (result.error) return { status: "error", error: toDomainError(result.error) };
  revalidateClasses(locale);
  return { status: "ok" };
}

const sessionSchema = z.object({ sessionId: z.uuid() });

/** Marca como presentes a todos los de la lista que aún no tienen marca. */
export async function markAllPresent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireStaff(locale);
  const parsed = parseForm(sessionSchema, formData);
  if (!parsed.ok) return { status: "error", error: "invalid" };
  const supabase = await createClient();
  const roster = await supabase.rpc("session_roster", { p_session_id: parsed.data.sessionId });
  if (roster.error) return { status: "error", error: toDomainError(roster.error) };
  const pending = roster.data.filter((r) => r.status === null).map((r) => ({ session_id: parsed.data.sessionId, student_id: r.student_id, status: "present" as const }));
  if (pending.length > 0) {
    const { error } = await supabase.from("attendance").insert(pending);
    if (error) return { status: "error", error: toDomainError(error) };
  }
  revalidateClasses(locale);
  return { status: "ok" };
}

const cancelSchema = z.object({ sessionId: z.uuid(), reason: z.string().trim().max(300).optional() });
export type CancelField = keyof z.input<typeof cancelSchema> & string;

/** Cancela una clase (se conserva en el calendario, con el motivo). */
export async function cancelSession(_prev: ActionState<CancelField>, formData: FormData): Promise<ActionState<CancelField>> {
  const locale = actionLocale(formData);
  await requireStaff(locale);
  const parsed = parseForm(cancelSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const { data, error } = await (await createClient())
    .from("sessions")
    .update({ status: "cancelled", cancel_reason: parsed.data.reason ?? null })
    .eq("id", parsed.data.sessionId)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data) return { status: "error", error: "not_found" };
  revalidateClasses(locale);
  return { status: "ok" };
}

/** Reactiva una clase cancelada (vuelve a "completada" si ya tiene asistencia, si no a "programada"). */
export async function restoreSession(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireStaff(locale);
  const parsed = parseForm(sessionSchema, formData);
  if (!parsed.ok) return { status: "error", error: "invalid" };
  const supabase = await createClient();
  const marks = await supabase.from("attendance").select("id", { count: "exact", head: true }).eq("session_id", parsed.data.sessionId);
  const { data, error } = await supabase
    .from("sessions")
    .update({ status: (marks.count ?? 0) > 0 ? "completed" : "scheduled", cancel_reason: null })
    .eq("id", parsed.data.sessionId)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data) return { status: "error", error: "not_found" };
  revalidateClasses(locale);
  return { status: "ok" };
}
