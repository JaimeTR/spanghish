"use server";

import { revalidatePath } from "next/cache";
import { extensionFor } from "@spanglish/content";
import { z } from "zod";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError, type DomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { requireArea } from "@/lib/require-area";
import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ASSIGNMENT_BUCKET, ASSIGNMENT_FILE_TYPES, ASSIGNMENT_MAX_BYTES } from "./files";

function revalidateAssignments(locale: string) {
  for (const area of ["student", "teacher", "admin"]) revalidatePath(`/${locale}/${area}`, "layout");
}

async function requireStaff(locale: ReturnType<typeof actionLocale>) {
  const user = await getSessionUser();
  await requireArea(locale, user?.roles.includes("admin") ? "admin" : "teacher");
}

// ---------------------------------------------------------------------------
// Alumno: entregar
// ---------------------------------------------------------------------------
type UploadResult = { ok: true; path: string; token: string } | { ok: false; error: DomainError | "type" | "size" };

/** Paso 1 de adjuntar un archivo: ruta y token de subida firmada (la política de Storage repite la regla). */
export async function requestSubmissionUpload(input: { assignmentId: string; studentId: string; mime: string; size: number }): Promise<UploadResult> {
  const user = await getSessionUser();
  if (!user || user.status !== "active" || !user.roles.includes("student")) return { ok: false, error: "forbidden" };
  const parsed = z.object({ assignmentId: z.uuid(), studentId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const extension = extensionFor(input.mime);
  if (!extension || !ASSIGNMENT_FILE_TYPES.includes(input.mime)) return { ok: false, error: "type" };
  if (input.size > ASSIGNMENT_MAX_BYTES) return { ok: false, error: "size" };
  const path = `${input.assignmentId}/${input.studentId}/${crypto.randomUUID()}.${extension}`;
  const signed = await (await createClient()).storage.from(ASSIGNMENT_BUCKET).createSignedUploadUrl(path);
  if (signed.error || !signed.data) return { ok: false, error: "forbidden" };
  return { ok: true, path, token: signed.data.token };
}

const submitSchema = z.object({
  assignmentId: z.uuid(),
  studentId: z.uuid(),
  textAnswer: z.string().trim().max(5000).optional(),
  filePath: z.string().max(300).optional(),
  fileName: z.string().trim().max(200).optional(),
  keepFile: z.literal("on").optional(),
});
export type SubmitField = keyof z.input<typeof submitSchema> & string;

/** Guarda (o reenvía) la entrega. Sin archivo nuevo se conserva el anterior; sin texto ni archivo no hay entrega. */
export async function submitAssignment(_prev: ActionState<SubmitField>, formData: FormData): Promise<ActionState<SubmitField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "student");
  const parsed = parseForm(submitSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const v = parsed.data;
  const supabase = await createClient();
  const existing = await supabase.from("assignment_submissions").select("id, file_path, file_name").eq("assignment_id", v.assignmentId).eq("student_id", v.studentId).maybeSingle();
  if (existing.error) return { status: "error", error: toDomainError(existing.error) };

  const filePath = v.filePath ?? (v.keepFile ? existing.data?.file_path : null) ?? null;
  const fileName = v.filePath ? (v.fileName ?? null) : filePath ? (existing.data?.file_name ?? null) : null;
  if (!v.textAnswer && !filePath) return { status: "invalid", fieldErrors: { textAnswer: "required" } };

  const row = { text_answer: v.textAnswer ?? null, file_path: filePath, file_name: fileName };
  const result = existing.data
    ? await supabase.from("assignment_submissions").update(row).eq("id", existing.data.id).select("id").maybeSingle()
    : await supabase.from("assignment_submissions").insert({ ...row, assignment_id: v.assignmentId, student_id: v.studentId }).select("id").maybeSingle();
  if (result.error) return { status: "error", error: toDomainError(result.error) };
  if (!result.data) return { status: "error", error: "conflict" };

  // Si se cambió de archivo, el anterior se borra (mejor esfuerzo).
  if (existing.data?.file_path && existing.data.file_path !== filePath) {
    await supabase.storage.from(ASSIGNMENT_BUCKET).remove([existing.data.file_path]);
  }
  revalidateAssignments(locale);
  return { status: "ok" };
}

// ---------------------------------------------------------------------------
// Docente: crear y calificar
// ---------------------------------------------------------------------------
const assignmentSchema = z.object({
  id: z.uuid().optional(),
  groupId: z.uuid(),
  title: z.string().trim().min(1).max(120),
  instructions: z.string().trim().max(4000).optional(),
  dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).optional(),
  maxGrade: z.coerce.number().pipe(z.union([z.literal(10), z.literal(20), z.literal(100)])),
  status: z.enum(["draft", "published"]),
});
export type AssignmentField = keyof z.input<typeof assignmentSchema> & string;

/** "2026-11-20T18:00" (hora escolar, Brisbane +10:00) → instante ISO. */
function dueInstant(local: string): string {
  return new Date(`${local}:00+10:00`).toISOString();
}

/** Crea o edita una tarea de un grupo (docente del grupo o administración; RLS lo repite). */
export async function saveAssignment(_prev: ActionState<AssignmentField>, formData: FormData): Promise<ActionState<AssignmentField>> {
  const locale = actionLocale(formData);
  await requireStaff(locale);
  const parsed = parseForm(assignmentSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const v = parsed.data;
  const row = {
    group_id: v.groupId,
    title: v.title,
    instructions: v.instructions ?? null,
    due_at: v.dueAt ? dueInstant(v.dueAt) : null,
    max_grade: v.maxGrade,
    status: v.status,
  };
  const supabase = await createClient();
  const { data, error } = v.id
    ? await supabase.from("assignments").update(row).eq("id", v.id).select("id").maybeSingle()
    : await supabase.from("assignments").insert(row).select("id").maybeSingle();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data) return { status: "error", error: "not_found" };
  revalidateAssignments(locale);
  return { status: "ok" };
}

const idSchema = z.object({ id: z.uuid() });

/** Elimina una tarea con sus entregas (los archivos subidos se borran aparte con la limpieza de Storage). */
export async function deleteAssignment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireStaff(locale);
  const parsed = parseForm(idSchema, formData);
  if (!parsed.ok) return { status: "error", error: "invalid" };
  const supabase = await createClient();
  const files = await supabase.from("assignment_submissions").select("file_path").eq("assignment_id", parsed.data.id).not("file_path", "is", null);
  const { error } = await supabase.from("assignments").delete().eq("id", parsed.data.id);
  if (error) return { status: "error", error: toDomainError(error) };
  const paths = (files.data ?? []).map((f) => f.file_path).filter((p): p is string => Boolean(p));
  if (paths.length > 0) await supabase.storage.from(ASSIGNMENT_BUCKET).remove(paths);
  revalidateAssignments(locale);
  return { status: "ok" };
}

const gradeSchema = z.object({
  id: z.uuid(),
  grade: z.string().trim().regex(/^\d{1,3}([.,]\d{1,2})?$/).optional(),
  feedback: z.string().trim().max(2000).optional(),
});
export type GradeField = keyof z.input<typeof gradeSchema> & string;

/** Pone nota y comentario. Sin nota la entrega vuelve a "entregada" (sin calificar). */
export async function gradeSubmission(_prev: ActionState<GradeField>, formData: FormData): Promise<ActionState<GradeField>> {
  const locale = actionLocale(formData);
  await requireStaff(locale);
  const parsed = parseForm(gradeSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const v = parsed.data;
  const { data, error } = await (await createClient())
    .from("assignment_submissions")
    .update({ grade: v.grade ? Number(v.grade.replace(",", ".")) : null, feedback: v.feedback ?? null })
    .eq("id", v.id)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data) return { status: "error", error: "not_found" };
  revalidateAssignments(locale);
  return { status: "ok" };
}

// ---------------------------------------------------------------------------
// Alumno: lecciones completadas
// ---------------------------------------------------------------------------
const lessonSchema = z.object({ studentId: z.uuid(), lessonId: z.uuid(), done: z.enum(["true", "false"]) });

/** Marca o desmarca una lección como completada. */
export async function setLessonCompleted(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireArea(locale, "student");
  const parsed = parseForm(lessonSchema, formData);
  if (!parsed.ok) return { status: "error", error: "invalid" };
  const { studentId, lessonId, done } = parsed.data;
  const supabase = await createClient();
  const { error } =
    done === "true"
      ? await supabase.from("lesson_completions").upsert({ student_id: studentId, lesson_id: lessonId }, { onConflict: "student_id,lesson_id", ignoreDuplicates: true })
      : await supabase.from("lesson_completions").delete().eq("student_id", studentId).eq("lesson_id", lessonId);
  if (error) return { status: "error", error: toDomainError(error) };
  revalidateAssignments(locale);
  return { status: "ok" };
}
