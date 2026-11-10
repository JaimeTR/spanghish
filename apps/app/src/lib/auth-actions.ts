"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocale, routing, type Locale } from "../i18n/routing";
import { roleHomePath } from "./access";
import { loadSessionUser } from "./load-session-user";
import { safeNextTarget } from "./route-guard";
import { resetPasswordUrl } from "./site-url";
import { resetSchema } from "./schemas/auth";
import { createClient } from "./supabase/server";
import { SESSION_ONLY_COOKIE } from "./supabase/session-preference";

export type LoginError = "credentials" | "suspended" | "no_access" | "unavailable";
export type LoginState = { error?: LoginError };
export type ForgotState = { status: "idle" | "sent" | "invalid" };
export type ResetState = { status: "idle" | "invalid" | "mismatch" | "expired" | "unavailable" };

const loginSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(256),
  next: z.string().max(2048).optional(),
});

const forgotSchema = z.object({ email: z.email().max(320) });

function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

function localeOf(formData: FormData): Locale {
  const value = field(formData, "locale");
  return value && isLocale(value) ? value : routing.defaultLocale;
}

/** Guarda (o borra) la preferencia "no mantener la sesión" para las renovaciones posteriores. */
async function rememberSessionPreference(remember: boolean): Promise<void> {
  const store = await cookies();
  if (remember) {
    store.delete(SESSION_ONLY_COOKIE);
    return;
  }
  // Sin maxAge: es ella misma una cookie de sesión.
  store.set(SESSION_ONLY_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const locale = localeOf(formData);
  const parsed = loginSchema.safeParse({
    email: field(formData, "email")?.trim(),
    password: field(formData, "password"),
    next: field(formData, "next") || undefined,
  });
  // Mismo mensaje genérico para formato inválido y credenciales erróneas.
  if (!parsed.success) return { error: "credentials" };

  // "Mantener la sesión iniciada": solo con el valor explícito "1" (el formulario lo
  // envía marcado por defecto); sin él, la sesión dura lo que el navegador.
  const remember = field(formData, "remember") === "1";
  const supabase = await createClient({ sessionOnly: !remember });
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  // No se distingue "no existe" de "contraseña incorrecta".
  if (error) return { error: error.status === 429 ? "unavailable" : "credentials" };
  await rememberSessionPreference(remember);

  const user = await loadSessionUser(supabase);
  if (!user) {
    await supabase.auth.signOut();
    return { error: "unavailable" };
  }
  if (user.status === "no_profile") {
    // Falla cerrado con el mensaje genérico (no el de suspensión).
    await supabase.auth.signOut();
    return { error: "credentials" };
  }
  if (user.status === "suspended") {
    // Sin sesión para cuentas suspendidas.
    await supabase.auth.signOut();
    redirect(`/${locale}/login?error=suspended`);
  }
  if (user.roles.length === 0) {
    await supabase.auth.signOut();
    return { error: "no_access" };
  }

  redirect(safeNextTarget(parsed.data.next, user.roles) ?? roleHomePath(user.roles, locale));
}

export async function requestPasswordReset(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const locale = localeOf(formData);
  const parsed = forgotSchema.safeParse({ email: field(formData, "email")?.trim() });
  if (!parsed.success) return { status: "invalid" };

  // La respuesta es idéntica exista o no el correo, y también si Auth falla;
  // los fallos solo se registran en el servidor (sin el correo: es dato personal).
  const redirectTo = resetPasswordUrl(locale);
  if (!redirectTo) {
    console.error("[forgot-password] NEXT_PUBLIC_SITE_URL no está configurada o no es válida");
    return { status: "sent" };
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
    if (error) {
      console.error("[forgot-password] resetPasswordForEmail falló", error.status, error.code);
    }
  } catch (cause) {
    console.error("[forgot-password] error inesperado", cause);
  }
  return { status: "sent" };
}

/**
 * Nueva contraseña con el token_hash del correo de recuperación.
 * La página no consume el token al abrirse (los escáneres de correo no lo
 * gastan): se verifica aquí, al enviar el formulario, y solo si la contraseña
 * ya es válida (un error de formato no gasta el enlace).
 */
export async function updatePassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const locale = localeOf(formData);
  const parsed = resetSchema.safeParse({
    tokenHash: field(formData, "tokenHash") ?? "",
    password: field(formData, "password") ?? "",
    confirm: field(formData, "confirm") ?? "",
  });
  if (!parsed.success) {
    const mismatch = parsed.error.issues.every((i) => i.message === "mismatch");
    return { status: mismatch ? "mismatch" : "invalid" };
  }

  const supabase = await createClient();
  const verified = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash: parsed.data.tokenHash,
  });
  if (verified.error) return { status: "expired" };

  const updated = await supabase.auth.updateUser({ password: parsed.data.password });
  if (updated.error) {
    // El enlace ya está gastado: se cierra la sesión y se pide uno nuevo.
    console.error("[reset-password] updateUser falló", updated.error.status, updated.error.code);
    await supabase.auth.signOut();
    return { status: "unavailable" };
  }

  const user = await loadSessionUser(supabase);
  if (user?.status === "suspended") {
    await supabase.auth.signOut();
    redirect(`/${locale}/login?error=suspended`);
  }
  if (!user || user.roles.length === 0) {
    await supabase.auth.signOut();
    redirect(`/${locale}/login`);
  }
  redirect(roleHomePath(user.roles, locale));
}

export async function logout(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect(`/${locale}/login`);
}
