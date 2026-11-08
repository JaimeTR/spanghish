/**
 * Formulario de contacto general (preguntas, sin pedir clase gratis). Misma
 * validación en el navegador y en el servidor, y el mismo antispam que la
 * solicitud de clase gratis (campo trampa + tiempo mínimo).
 */
import { EMAIL, PHONE_CHARS, readText } from "./booking";

export const CONTACT_FIELDS = ["name", "email", "phone", "message", "consent"] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

export type ContactData = { name: string; email: string; phone: string; message: string; consent: true };
export type ContactErrorCode = "required" | "email" | "phone" | "tooLong" | "consent";
export type ContactErrors = Partial<Record<ContactField, ContactErrorCode>>;

export const CONTACT_MAX: Record<"name" | "email" | "phone" | "message", number> = {
  name: 100,
  email: 254,
  phone: 30,
  message: 2000,
};

type Input = { get(name: string): FormDataEntryValue | null };
export type ContactResult = { ok: true; data: ContactData } | { ok: false; errors: ContactErrors };

export function validateContact(input: Input): ContactResult {
  const errors: ContactErrors = {};
  const name = readText(input, "name");
  const email = readText(input, "email").toLowerCase();
  const phone = readText(input, "phone");
  const message = readText(input, "message", true);

  if (!name) errors.name = "required";
  else if (name.length > CONTACT_MAX.name) errors.name = "tooLong";

  if (!email) errors.email = "required";
  else if (email.length > CONTACT_MAX.email) errors.email = "tooLong";
  else if (!EMAIL.test(email)) errors.email = "email";

  if (phone) {
    const digits = phone.replace(/\D/g, "").length;
    if (phone.length > CONTACT_MAX.phone) errors.phone = "tooLong";
    else if (!PHONE_CHARS.test(phone) || digits < 6 || digits > 15) errors.phone = "phone";
  }

  if (!message) errors.message = "required";
  else if (message.length > CONTACT_MAX.message) errors.message = "tooLong";

  if (input.get("consent") !== "yes") errors.consent = "consent";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { name, email, phone, message, consent: true } };
}
