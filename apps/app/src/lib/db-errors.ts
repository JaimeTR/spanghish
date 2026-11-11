/**
 * Errores de dominio que lanza la base de datos (ver "Contratos comunes" del
 * plan 1B). Las migraciones usan `raise exception '<code>' using errcode =
 * 'P0001'` y `42501` para autorización. La app nunca muestra el mensaje crudo:
 * traduce el código con `errors.domain.<code>`.
 */
export const DOMAIN_ERRORS = [
  "forbidden",
  "not_found",
  "conflict",
  "already_enrolled",
  "slot_taken",
  "group_full",
  "group_closed",
  "student_inactive",
  "guardian_required",
  "consent_required",
  "teacher_required",
  "session_not_editable",
  "session_has_attendance",
  "outside_attendance_window",
  "not_in_roster",
  "last_admin",
  "invalid_range",
  "horizon_too_far",
  "lead_already_converted",
  "content_incomplete",
  "slug_taken",
  "attempts_exhausted",
  "unknown",
] as const;

export type DomainError = (typeof DOMAIN_ERRORS)[number];

type DbError = { code?: string; message?: string; details?: string } | null;

function isDomainError(value: string): value is DomainError {
  return (DOMAIN_ERRORS as readonly string[]).includes(value);
}

export function toDomainError(error: DbError): DomainError {
  if (!error) return "unknown";
  const message = error.message?.trim() ?? "";
  switch (error.code) {
    case "42501":
      return "forbidden";
    case "P0001":
      return isDomainError(message) ? message : "unknown";
    case "23505": {
      const text = `${message} ${error.details ?? ""}`;
      if (text.includes("enrollments_seat_unique")) return "already_enrolled";
      if (text.includes("sessions_group_starts_unique")) return "slot_taken";
      if (text.includes("lessons_slug_key") || text.includes("tests_slug_key")) return "slug_taken";
      return "conflict";
    }
    case "PGRST116": // .single() sin filas: RLS no deja verla o no existe
      return "not_found";
    default:
      return "unknown";
  }
}
