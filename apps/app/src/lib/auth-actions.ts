"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocale, routing, type Locale } from "../i18n/routing";
import { roleHomePath } from "./access";
import { loadSessionUser } from "./load-session-user";
import { safeNextTarget } from "./route-guard";
import { createClient } from "./supabase/server";

export type LoginError = "credentials" | "suspended" | "no_access" | "unavailable";
export type LoginState = { error?: LoginError };
export type ForgotState = { status: "idle" | "sent" | "invalid" };

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

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const locale = localeOf(formData);
  const parsed = loginSchema.safeParse({
    email: field(formData, "email")?.trim(),
    password: field(formData, "password"),
    next: field(formData, "next") || undefined,
  });
  // Mismo mensaje genérico para formato inválido y credenciales erróneas.
  if (!parsed.success) return { error: "credentials" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  // No se distingue "no existe" de "contraseña incorrecta".
  if (error) return { error: error.status === 429 ? "unavailable" : "credentials" };

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

function resetRedirectUrl(locale: Locale): string | null {
  // Nunca a partir de la cabecera Host: solo de la URL configurada.
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) return null;
  try {
    const url = new URL(`/${locale}/reset-password`, site);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
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
  const redirectTo = resetRedirectUrl(locale);
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

export async function logout(formData: FormData): Promise<void> {
  const locale = localeOf(formData);
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect(`/${locale}/login`);
}
