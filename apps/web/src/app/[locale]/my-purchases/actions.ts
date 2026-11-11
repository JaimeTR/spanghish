"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale } from "@/i18n/routing";
import { localePath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type LoginLinkState = { status: "idle" | "sent" | "invalid" | "failed" };

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

/**
 * Pide el enlace de acceso. Solo entran correos que ya compraron (no se crean cuentas aquí)
 * y la respuesta es siempre la misma: no se revela si un correo existe.
 */
export async function sendLoginLink(_prev: LoginLinkState, formData: FormData): Promise<LoginLinkState> {
  const locale = formData.get("locale");
  const email = formData.get("email");
  if (typeof locale !== "string" || !isLocale(locale) || typeof email !== "string" || !EMAIL.test(email.trim())) return { status: "invalid" };
  const supabase = await createClient();
  if (!supabase) return { status: "failed" };
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) return { status: "failed" };
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: false, emailRedirectTo: `${proto}://${host}/api/auth/callback?locale=${locale}` },
  });
  // Un correo sin compras da "usuario no encontrado": se responde igual que en el éxito.
  if (error && error.status !== undefined && error.status >= 500) return { status: "failed" };
  return { status: "sent" };
}

export async function signOutCustomer(formData: FormData) {
  const locale = formData.get("locale");
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect(localePath(typeof locale === "string" && isLocale(locale) ? locale : "es", "myPurchases"));
}
