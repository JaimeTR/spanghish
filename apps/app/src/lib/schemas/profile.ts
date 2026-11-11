import { z } from "zod";
import { localeField } from "./people";

const today = () => new Date().toISOString().slice(0, 10);

/** Teléfono: dígitos, espacios, +, guiones y paréntesis; 6–30 caracteres. */
const phone = z
  .string()
  .trim()
  .min(6)
  .max(30)
  .regex(/^\+?[0-9 ()-]+$/, { message: "invalid" });

/** Mis datos: lo que cada persona puede editar de su propio perfil. */
export const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  phone: phone.optional(),
  birthDate: z.iso
    .date()
    .refine((d) => d >= "1900-01-01" && d <= today(), { message: "range" })
    .optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  preferredLocale: localeField,
});
export type ProfileInput = z.infer<typeof profileSchema>;
