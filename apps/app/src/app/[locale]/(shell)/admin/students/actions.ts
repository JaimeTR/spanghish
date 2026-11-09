"use server";

import type { Json } from "@spanglish/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { provisionAccount } from "@/lib/people/provision";
import { requireArea } from "@/lib/require-area";
import {
  parseStudentForm,
  recordConsentSchema,
  studentIdSchema,
  updateStudentSchema,
  type StudentField,
} from "@/lib/schemas/people";
import { createClient } from "@/lib/supabase/server";

export type UpdateStudentField =
  | "studentId"
  | "fullName"
  | "levelId"
  | "preferredLocale"
  | "status"
  | "email"
  | "phone"
  | "birthYear"
  | "adminNotes";
export type ConsentField = "studentId" | "textId" | "granted" | "method" | "guardianId";
export type PortalField = "studentId" | "email";

/** Sin claves vacías: create_student trata la ausencia como null. */
function compact(value: Record<string, unknown>): Json {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null)) as Json;
}

/**
 * Alta de alumno con create_student() (una transacción: ficha, datos privados
 * y, si es menor, tutor y consentimiento minor_data). Redirige a la ficha.
 */
export async function createStudent(
  _prev: ActionState<StudentField>,
  formData: FormData,
): Promise<ActionState<StudentField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");

  const parsed = parseStudentForm(formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const d = parsed.data;

  const payload = compact({
    full_name: d.fullName,
    audience: d.audience,
    level_id: d.levelId,
    preferred_locale: d.preferredLocale,
    email: d.email,
    phone: d.phone,
    birth_year: d.birthYear,
    admin_notes: d.adminNotes,
    ...(d.audience === "kids"
      ? {
          guardian: d.guardianId
            ? compact({ id: d.guardianId, relationship: d.guardianRelationship })
            : compact({
                full_name: d.guardianFullName,
                email: d.guardianEmail,
                phone: d.guardianPhone,
                relationship: d.guardianRelationship,
                preferred_locale: d.preferredLocale,
              }),
          consent: { text_id: d.consentTextId, method: d.consentMethod },
        }
      : {}),
  });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_student", { p_payload: payload });
  if (error || !data) return { status: "error", error: toDomainError(error) };

  revalidatePath(`/${locale}/admin/students`);
  redirect(`/${locale}/admin/students/${data}`);
}

/** Datos de la ficha y contacto privado (student_private). RLS: solo admin. */
export async function updateStudent(
  _prev: ActionState<UpdateStudentField>,
  formData: FormData,
): Promise<ActionState<UpdateStudentField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");

  const parsed = parseForm(updateStudentSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const d = parsed.data;

  const supabase = await createClient();
  const student = await supabase
    .from("students")
    .update({
      full_name: d.fullName,
      level_id: d.levelId ?? null,
      preferred_locale: d.preferredLocale,
      status: d.status,
    })
    .eq("id", d.studentId)
    .select("id")
    .maybeSingle();
  if (student.error) return { status: "error", error: toDomainError(student.error) };
  if (!student.data) return { status: "error", error: "not_found" };

  const contact = await supabase.from("student_private").upsert(
    {
      student_id: d.studentId,
      email: d.email ?? null,
      phone: d.phone ?? null,
      birth_year: d.birthYear ?? null,
    },
    { onConflict: "student_id" },
  );
  if (contact.error) return { status: "error", error: toDomainError(contact.error) };

  // Notas internas: tabla aparte que solo ve la administración (RLS).
  const notes = d.adminNotes
    ? await supabase
        .from("student_admin_notes")
        .upsert({ student_id: d.studentId, notes: d.adminNotes }, { onConflict: "student_id" })
    : await supabase.from("student_admin_notes").delete().eq("student_id", d.studentId);
  if (notes.error) return { status: "error", error: toDomainError(notes.error) };

  revalidatePath(`/${locale}/admin/students`, "layout");
  return { status: "ok" };
}

/**
 * Cuenta de portal para un alumno adulto con correo: provisionAccount con rol
 * student y después students.profile_id. Si la cuenta ya existía (p. ej. un
 * intento anterior a medias) se enlaza; la BD exige que tenga rol student.
 */
export async function grantPortalAccess(
  _prev: ActionState<PortalField>,
  formData: FormData,
): Promise<ActionState<PortalField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");

  const parsed = parseForm(studentIdSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };

  const supabase = await createClient();
  const { data: student, error } = await supabase
    .from("students")
    .select("id, full_name, is_minor, profile_id, preferred_locale, student_private(email)")
    .eq("id", parsed.data.studentId)
    .maybeSingle();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!student) return { status: "error", error: "not_found" };
  if (student.is_minor) return { status: "error", error: "forbidden" };
  if (student.profile_id) return { status: "error", error: "conflict" };
  const email = student.student_private?.email;
  if (!email) return { status: "invalid", fieldErrors: { email: "required" } };

  const result = await provisionAccount({
    email,
    fullName: student.full_name,
    initialRole: "student",
    locale: student.preferred_locale === "en" ? "en" : "es",
  });

  let userId: string | null = result.ok ? result.userId : null;
  if (!result.ok && result.error === "exists") {
    const existing = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
    userId = existing.data?.id ?? null;
  }
  if (!userId) {
    return result.ok || result.error !== "invalid"
      ? { status: "error", error: "unknown" }
      : { status: "invalid", fieldErrors: { email: "email" } };
  }

  const link = await supabase
    .from("students")
    .update({ profile_id: userId })
    .eq("id", student.id)
    .select("id")
    .maybeSingle();
  if (link.error) return { status: "error", error: toDomainError(link.error) };

  revalidatePath(`/${locale}/admin/students`, "layout");
  return { status: "ok" };
}

/** Nuevo registro de consentimiento (concedido o revocado); nunca se edita uno anterior. */
export async function recordConsent(
  _prev: ActionState<ConsentField>,
  formData: FormData,
): Promise<ActionState<ConsentField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");

  const parsed = parseForm(recordConsentSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const d = parsed.data;

  const supabase = await createClient();
  const text = await supabase.from("consent_texts").select("id, kind").eq("id", d.textId).maybeSingle();
  if (text.error) return { status: "error", error: toDomainError(text.error) };
  if (!text.data) return { status: "invalid", fieldErrors: { textId: "invalid" } };

  const { error } = await supabase.from("consents").insert({
    student_id: d.studentId,
    guardian_id: d.guardianId ?? null,
    text_id: text.data.id,
    kind: text.data.kind,
    granted: d.granted === "true",
    method: d.method,
  });
  if (error) return { status: "error", error: toDomainError(error) };

  revalidatePath(`/${locale}/admin/students/${d.studentId}`);
  return { status: "ok" };
}
