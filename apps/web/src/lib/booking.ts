/**
 * Solicitud de clase gratis: campos, validación (la misma en el navegador y en
 * el servidor) y comprobaciones antispam sin CAPTCHA (campo trampa + tiempo
 * mínimo de rellenado). Sin dependencias: son pocas reglas.
 */

export const AUDIENCE_OPTIONS = ["adults", "kids", "mature"] as const;
export const PLACE_OPTIONS = ["sunshineCoast", "brisbane", "online", "notSure"] as const;
export const LANGUAGE_OPTIONS = ["spanish", "english"] as const;

export type BookingAudience = (typeof AUDIENCE_OPTIONS)[number];
export type BookingPlace = (typeof PLACE_OPTIONS)[number];
export type BookingLanguage = (typeof LANGUAGE_OPTIONS)[number];

export type BookingData = {
  name: string;
  email: string;
  phone: string;
  audience: BookingAudience;
  place: BookingPlace;
  times: string;
  language: BookingLanguage;
  message: string;
  consent: true;
};

/** Orden de los campos en el formulario (también el del resumen de errores). */
export const BOOKING_FIELDS = ["name", "email", "phone", "audience", "place", "times", "language", "message", "consent"] as const;
export type BookingField = (typeof BOOKING_FIELDS)[number];

export type BookingErrorCode = "required" | "email" | "phone" | "tooLong" | "choice" | "consent";
export type BookingErrors = Partial<Record<BookingField, BookingErrorCode>>;

export const MAX_LENGTH: Record<"name" | "email" | "phone" | "times" | "message", number> = {
  name: 100,
  email: 254,
  phone: 30,
  times: 300,
  message: 2000,
};

/** Nombre del campo trampa: invisible para personas, tentador para bots. */
export const HONEYPOT_FIELD = "website";
/** Momento (ms) en que se mostró el formulario; lo rellena el navegador. */
export const STARTED_AT_FIELD = "startedAt";
/** Nadie rellena el formulario de verdad en menos de 3 segundos. */
export const MIN_FILL_MS = 3000;
/** Un formulario abierto hace más de un día se considera caducado (o falsificado). */
const MAX_FILL_MS = 24 * 60 * 60 * 1000;

// Formato de email razonable (no RFC completo): algo@dominio.tld, sin espacios.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Teléfono: dígitos, espacios, +, guiones, paréntesis y puntos; entre 6 y 15 dígitos.
const PHONE_CHARS = /^[+\d\s().-]+$/;
// Caracteres de control (salvo saltos de línea y tabulador en textos largos).
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

type Input = { get(name: string): FormDataEntryValue | null };

function text(input: Input, name: string, multiline = false): string {
  const raw = input.get(name);
  if (typeof raw !== "string") return "";
  const clean = raw.replace(CONTROL, "");
  return multiline ? clean.replace(/\r\n?/g, "\n").trim() : clean.replace(/\s+/g, " ").trim();
}

function oneOf<T extends string>(value: string, options: readonly T[]): value is T {
  return (options as readonly string[]).includes(value);
}

export type BookingResult = { ok: true; data: BookingData } | { ok: false; errors: BookingErrors };

/** Valida un FormData (o cualquier objeto con `get`). Devuelve datos limpios o errores por campo. */
export function validateBooking(input: Input): BookingResult {
  const errors: BookingErrors = {};
  const name = text(input, "name");
  const email = text(input, "email").toLowerCase();
  const phone = text(input, "phone");
  const audience = text(input, "audience");
  const place = text(input, "place");
  const times = text(input, "times", true);
  const language = text(input, "language");
  const message = text(input, "message", true);
  const consent = input.get("consent");

  if (!name) errors.name = "required";
  else if (name.length > MAX_LENGTH.name) errors.name = "tooLong";

  if (!email) errors.email = "required";
  else if (email.length > MAX_LENGTH.email) errors.email = "tooLong";
  else if (!EMAIL.test(email)) errors.email = "email";

  if (phone) {
    const digits = phone.replace(/\D/g, "").length;
    if (phone.length > MAX_LENGTH.phone) errors.phone = "tooLong";
    else if (!PHONE_CHARS.test(phone) || digits < 6 || digits > 15) errors.phone = "phone";
  }

  if (!audience) errors.audience = "required";
  else if (!oneOf(audience, AUDIENCE_OPTIONS)) errors.audience = "choice";

  if (!place) errors.place = "required";
  else if (!oneOf(place, PLACE_OPTIONS)) errors.place = "choice";

  if (!times) errors.times = "required";
  else if (times.length > MAX_LENGTH.times) errors.times = "tooLong";

  if (!language) errors.language = "required";
  else if (!oneOf(language, LANGUAGE_OPTIONS)) errors.language = "choice";

  if (message.length > MAX_LENGTH.message) errors.message = "tooLong";

  if (consent !== "yes") errors.consent = "consent";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name,
      email,
      phone,
      audience: audience as BookingAudience,
      place: place as BookingPlace,
      times,
      language: language as BookingLanguage,
      message,
      consent: true,
    },
  };
}

/**
 * ¿Parece un bot? Campo trampa relleno, sin marca de tiempo, enviado demasiado
 * rápido o con una marca imposible. `now` es inyectable para los tests.
 */
export function isLikelySpam(input: Input, now: number = Date.now()): boolean {
  const trap = input.get(HONEYPOT_FIELD);
  if (typeof trap === "string" && trap.trim() !== "") return true;
  const started = Number(input.get(STARTED_AT_FIELD));
  if (!Number.isFinite(started) || started <= 0) return true;
  const elapsed = now - started;
  return elapsed < MIN_FILL_MS || elapsed > MAX_FILL_MS;
}
