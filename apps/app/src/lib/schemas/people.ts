import { z } from "zod";

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
