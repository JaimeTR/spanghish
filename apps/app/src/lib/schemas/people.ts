import { z } from "zod";
import { parseForm, type FieldErrors } from "../forms";

/** Correo normalizado (sin espacios y en minúsculas), máximo 254. */
export const emailField = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const localeField = z.enum(["es", "en"]);

/** Alta de docente: la cuenta se crea con rol teacher y recibe un enlace para elegir contraseña. */
export const inviteTeacherSchema = z.object({
  email: emailField,
  fullName: z.string().trim().min(1).max(120),
  locale: localeField,
});
export type InviteTeacherInput = z.infer<typeof inviteTeacherSchema>;

export const suspendAccountSchema = z.object({
  userId: z.uuid(),
  suspended: z.enum(["true", "false"]),
});

// ---------------------------------------------------------------------------
// Alumnos
// ---------------------------------------------------------------------------
const optionalText = (max: number) => z.string().trim().max(max).optional();
export const GENDERS = ["female", "male", "other", "unspecified"] as const;
const today = () => new Date().toISOString().slice(0, 10);
const gender = z.enum(GENDERS).optional();
/** Fecha de nacimiento completa (de ella sale la edad); no puede ser futura. */
const birthDate = z.iso
  .date()
  .refine((d) => d >= "1900-01-01" && d <= today(), { message: "range" })
  .optional();
const optionalEmail = emailField.optional();

export const CONSENT_KINDS = ["enrolment_terms", "privacy", "minor_data", "recordings", "photos"] as const;
export const CONSENT_METHODS = ["paper", "email", "portal", "web_form"] as const;
export const RELATIONSHIPS = ["parent", "legal_guardian", "other"] as const;
export const STUDENT_STATUSES = ["active", "inactive"] as const;

const studentBase = {
  fullName: z.string().trim().min(1).max(120),
  levelId: z.uuid().optional(),
  preferredLocale: localeField,
  email: optionalEmail,
  phone: optionalText(30),
  gender,
  birthDate,
};

/** Adulto (14+) o mayor (65+): sin tutor ni consentimiento de menor. */
const adultLike = <A extends "adults" | "mature">(audience: A) =>
  z.object({ audience: z.literal(audience), ...studentBase });

export const adultSchema = adultLike("adults");
export const matureSchema = adultLike("mature");

/**
 * Menor (6–13): tutor existente (guardianId) o nuevo (nombre + email), y el
 * consentimiento minor_data con la versión del texto, el método y la
 * confirmación de la administradora.
 */
export const kidSchema = z
  .object({
    audience: z.literal("kids"),
    ...studentBase,
    guardianId: z.uuid().optional(),
    guardianFullName: optionalText(120),
    guardianEmail: optionalEmail,
    guardianPhone: optionalText(30),
    guardianRelationship: z.enum(RELATIONSHIPS).optional(),
    consentTextId: z.string().regex(/^[a-z_]+-v[0-9]+$/),
    consentMethod: z.enum(CONSENT_METHODS),
    consentGranted: z.literal("on"),
  })
  .superRefine(
    (d, ctx) => {
      if (d.guardianId) return;
      if (!d.guardianFullName) ctx.addIssue({ code: "custom", path: ["guardianFullName"], message: "required" });
      if (!d.guardianEmail) ctx.addIssue({ code: "custom", path: ["guardianEmail"], message: "required" });
    },
    // También cuando otros campos fallan: el formulario marca todos los errores a la vez.
    { when: (payload) => typeof payload.value === "object" && payload.value !== null },
  );

export const studentSchema = z.discriminatedUnion("audience", [adultSchema, matureSchema, kidSchema]);
export type StudentInput = z.infer<typeof studentSchema>;
export type StudentField = keyof z.infer<typeof kidSchema> & string;

/**
 * parseForm para el alta de alumno: el segmento elige el esquema (parseForm
 * necesita un objeto con `shape`, no una unión).
 */
export function parseStudentForm(
  formData: FormData,
): { ok: true; data: StudentInput } | { ok: false; fieldErrors: FieldErrors<StudentField> } {
  const audience = formData.get("audience");
  if (audience === "adults") return parseForm(adultSchema, formData);
  if (audience === "mature") return parseForm(matureSchema, formData);
  if (audience === "kids") return parseForm(kidSchema, formData);
  return { ok: false, fieldErrors: { audience: audience ? "invalid" : "required" } };
}

/** Edición de la ficha: datos y contacto (el segmento no cambia aquí). */
export const updateStudentSchema = z.object({
  studentId: z.uuid(),
  fullName: studentBase.fullName,
  levelId: studentBase.levelId,
  preferredLocale: localeField,
  status: z.enum(STUDENT_STATUSES),
  email: optionalEmail,
  phone: optionalText(30),
  gender,
  birthDate,
  adminNotes: optionalText(2000),
});

export const studentIdSchema = z.object({ studentId: z.uuid() });

/** Nuevo registro de consentimiento (append-only): concedido o revocado. */
export const recordConsentSchema = z.object({
  studentId: z.uuid(),
  textId: z.string().regex(/^[a-z_]+-v[0-9]+$/),
  granted: z.enum(["true", "false"]),
  method: z.enum(CONSENT_METHODS),
  guardianId: z.uuid().optional(),
});

/** Nueva versión de un texto de consentimiento (el id <tipo>-v<n> lo pone el servidor). */
export const consentTextSchema = z.object({
  kind: z.enum(CONSENT_KINDS),
  bodyEs: z.string().trim().min(1).max(20000),
  bodyEn: z.string().trim().min(1).max(20000),
  effectiveFrom: z.iso.date(),
});
