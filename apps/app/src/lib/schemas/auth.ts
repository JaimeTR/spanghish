import { z } from "zod";

/**
 * Formulario de /reset-password. 10 caracteres mínimo (la app lo exige mientras
 * el Auth remoto no se endurezca, hito 3) y 72 máximo (límite de bcrypt).
 * La confirmación distinta se marca con el mensaje "mismatch" en `confirm`
 * (solo se evalúa si lo demás es válido).
 */
export const resetSchema = z
  .object({
    tokenHash: z.string().min(10).max(512),
    password: z.string().min(10).max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "mismatch", path: ["confirm"] });

export type ResetInput = z.infer<typeof resetSchema>;
