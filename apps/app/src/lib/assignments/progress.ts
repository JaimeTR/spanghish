/** Cálculos del progreso del alumno (sin acceso a datos: se prueban solos). */
export type AttendanceRow = { status: "present" | "late" | "absent" | "excused" };

/**
 * Asistencia: presentes y tardes cuentan como asistidas; las faltas, no. Las justificadas no
 * pesan ni a favor ni en contra. `percent` es null si todavía no hay clases que contar.
 */
export function attendanceSummary(rows: readonly AttendanceRow[]) {
  const count = (s: AttendanceRow["status"]) => rows.filter((r) => r.status === s).length;
  const attended = count("present") + count("late");
  const counted = attended + count("absent");
  return {
    present: count("present"),
    late: count("late"),
    absent: count("absent"),
    excused: count("excused"),
    percent: counted === 0 ? null : Math.round((attended / counted) * 100),
  };
}

/** Promedio de las tareas calificadas, en % de la nota máxima de cada una; null si no hay. */
export function assignmentsAverage(rows: readonly { grade: number | null; max: number }[]): number | null {
  const graded = rows.filter((r): r is { grade: number; max: number } => r.grade !== null && r.max > 0);
  if (graded.length === 0) return null;
  return Math.round((graded.reduce((sum, r) => sum + (r.grade / r.max) * 100, 0) / graded.length) * 10) / 10;
}
