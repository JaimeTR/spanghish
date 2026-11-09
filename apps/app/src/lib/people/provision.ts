import "server-only";
import type { Database } from "@spanglish/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "../../i18n/routing";
import { resetPasswordUrl } from "../site-url";
import { createAdminClient } from "../supabase/admin";

export type InitialRole = "teacher" | "student" | "guardian";

export type ProvisionInput = {
  email: string;
  fullName: string;
  initialRole: InitialRole;
  locale: Locale;
};

/**
 * `emailSent: false`: la cuenta existe pero el correo para elegir contraseña no
 * salió (límite de envíos, SMTP caído); la persona puede usar "¿Olvidaste tu
 * contraseña?".
 */
export type ProvisionResult =
  | { ok: true; userId: string; emailSent: boolean }
  | { ok: false; error: "exists" | "invalid" | "unavailable" };

const EXISTS_CODES = new Set(["email_exists", "user_already_exists"]);
const INVALID_CODES = new Set(["email_address_invalid", "validation_failed", "email_address_not_authorized"]);

type AuthError = { status?: number; code?: string } | null;

function classify(error: AuthError): "exists" | "invalid" | "unavailable" {
  if (error?.code && EXISTS_CODES.has(error.code)) return "exists";
  if (error?.code && INVALID_CODES.has(error.code)) return "invalid";
  return "unavailable";
}

/**
 * Crea una cuenta de Auth (correo confirmado, sin contraseña) con el rol
 * inicial en app_metadata (lo aplica el trigger de 0007; nunca user_metadata,
 * que el usuario puede editar) y envía el correo de recuperación que lleva a
 * /<locale>/reset-password para elegir contraseña.
 *
 * Quien la llame DEBE haber comprobado antes que la usuaria es admin.
 */
export async function provisionAccount(
  input: ProvisionInput,
  deps: { admin?: SupabaseClient<Database>; auth?: SupabaseClient<Database>; siteUrl?: string } = {},
): Promise<ProvisionResult> {
  let admin = deps.admin;
  if (!admin) {
    try {
      admin = createAdminClient();
    } catch (cause) {
      console.error("[provision] falta la configuración de la service_role", cause);
      return { ok: false, error: "unavailable" };
    }
  }

  const created = await admin.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
    app_metadata: { initial_role: input.initialRole },
    user_metadata: { full_name: input.fullName },
  });
  if (created.error || !created.data.user) {
    const error = classify(created.error);
    if (error === "unavailable") {
      console.error("[provision] createUser falló", created.error?.status, created.error?.code);
    }
    return { ok: false, error };
  }
  const userId = created.data.user.id;

  // Idioma preferido de la cuenta (la service_role tiene DML en profiles).
  const profile = await admin.from("profiles").update({ preferred_locale: input.locale }).eq("id", userId);
  if (profile.error) console.error("[provision] no se pudo fijar el idioma", profile.error.code);

  const redirectTo = resetPasswordUrl(input.locale, deps.siteUrl);
  if (!redirectTo) {
    console.error("[provision] NEXT_PUBLIC_SITE_URL no está configurada o no es válida");
    return { ok: true, userId, emailSent: false };
  }
  const auth = deps.auth ?? admin;
  const sent = await auth.auth.resetPasswordForEmail(input.email, { redirectTo });
  if (sent.error) {
    // Sin el correo en el registro: es dato personal.
    console.error("[provision] resetPasswordForEmail falló", sent.error.status, sent.error.code);
  }
  return { ok: true, userId, emailSent: !sent.error };
}
