/** Archivos de las entregas: bucket privado y reglas (iguales a las del bucket en la migración 0038). */
export const ASSIGNMENT_BUCKET = "assignment-files";
export const ASSIGNMENT_MAX_BYTES = 10_485_760;
export const ASSIGNMENT_FILE_TYPES: readonly string[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "audio/mpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/** Estado de una tarea para el alumno, a partir de su entrega y la fecha límite. */
export type AssignmentState = "todo" | "overdue" | "submitted" | "late" | "graded";

export function assignmentState(
  submission: { status: string; is_late: boolean } | null | undefined,
  dueAt: string | null,
  now: Date = new Date(),
): AssignmentState {
  if (submission) return submission.status === "graded" ? "graded" : submission.is_late ? "late" : "submitted";
  return dueAt && new Date(dueAt) < now ? "overdue" : "todo";
}

/** Nota sobre la nota máxima: "8,5 / 10". */
export function formatGrade(grade: number, max: number, locale: "es" | "en"): string {
  const text = new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-AU", { maximumFractionDigits: 2 }).format(grade);
  return `${text} / ${max}`;
}
