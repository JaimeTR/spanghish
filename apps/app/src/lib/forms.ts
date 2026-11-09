import type { z } from "zod";
import type { DomainError } from "./db-errors";

/**
 * Formularios con Server Actions + zod (patrón del login): la acción valida con
 * `parseForm`, escribe con el cliente del usuario y devuelve un `ActionState`.
 * Los errores por campo son claves de `forms.errors.*`, nunca textos de zod.
 */
export const FORM_ERROR_KEYS = [
  "required",
  "tooLong",
  "invalid",
  "email",
  "url",
  "number",
  "date",
  "range",
  "slugTaken",
] as const;

export type FormErrorKey = (typeof FORM_ERROR_KEYS)[number];
export type FieldErrors<F extends string> = Partial<Record<F, FormErrorKey>>;

export type ActionState<F extends string = string> =
  | { status: "idle" }
  | { status: "invalid"; fieldErrors: FieldErrors<F> }
  | { status: "error"; error: DomainError }
  | { status: "ok" };

type Issue = z.core.$ZodIssue;

function isFormErrorKey(value: string): value is FormErrorKey {
  return (FORM_ERROR_KEYS as readonly string[]).includes(value);
}

function errorKey(issue: Issue): FormErrorKey {
  switch (issue.code) {
    case "too_big":
      return issue.origin === "string" || issue.origin === "array" ? "tooLong" : "range";
    case "too_small":
      return issue.origin === "string" || issue.origin === "array" ? "invalid" : "range";
    case "invalid_type":
      return issue.expected === "number" ? "number" : "invalid";
    case "invalid_format":
      if (issue.format === "email") return "email";
      if (issue.format === "url") return "url";
      if (issue.format === "date" || issue.format === "datetime") return "date";
      return "invalid";
    case "custom":
      return isFormErrorKey(issue.message) ? issue.message : "invalid";
    default:
      return "invalid";
  }
}

/**
 * Lee los campos del esquema desde FormData (las cadenas vacías o en blanco
 * pasan a `undefined`) y los valida. Un campo ausente con error es "required";
 * si no, se usa el primer error de cada campo.
 */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
):
  | { ok: true; data: z.infer<S> }
  | { ok: false; fieldErrors: FieldErrors<keyof z.infer<S> & string> } {
  const raw: Record<string, string | undefined> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") raw[key] = value.trim() !== "" ? value : undefined;
  });

  const parsed = schema.safeParse(raw);
  if (parsed.success) {
    // Sin claves undefined: el resultado es el mismo con o sin campos opcionales vacíos.
    const data = Object.fromEntries(
      Object.entries(parsed.data as Record<string, unknown>).filter(([, v]) => v !== undefined),
    );
    return { ok: true, data: data as z.infer<S> };
  }

  const fieldErrors: Record<string, FormErrorKey> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string" || field in fieldErrors) continue;
    fieldErrors[field] = raw[field] === undefined ? "required" : errorKey(issue);
  }
  return { ok: false, fieldErrors: fieldErrors as FieldErrors<keyof z.infer<S> & string> };
}
