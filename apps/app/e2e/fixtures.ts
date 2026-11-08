// SOLO DESARROLLO LOCAL: usuarios creados por supabase/seed.sql.
import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

export const DEV_PASSWORD = "Spanglish-dev-2026";

export const USERS = {
  admin: "admin@spanglish.test",
  teacher: "teacher@spanglish.test",
  student: "student@spanglish.test",
  suspended: "suspended@spanglish.test",
} as const;

export async function login(
  page: Page,
  email: string,
  { locale = "es", next, password = DEV_PASSWORD }: { locale?: string; next?: string; password?: string } = {},
) {
  const query = next === undefined ? "" : `?next=${encodeURIComponent(next)}`;
  await page.goto(`/${locale}/login${query}`);
  await page.getByLabel(locale === "en" ? "Email" : "Correo electrónico").fill(email);
  await page.getByLabel(locale === "en" ? "Password" : "Contraseña").fill(password);
  await page.getByRole("button", { name: locale === "en" ? "Sign in" : "Iniciar sesión" }).click();
}

/** Ruta + query de la página actual (sin origen). */
export function pathOf(page: Page): string {
  const url = new URL(page.url());
  return url.pathname + url.search;
}

export async function expectPath(page: Page, expected: string) {
  await expect.poll(() => pathOf(page)).toBe(expected);
}

/**
 * Región de errores del login (role="alert"). Se busca por id porque Next.js
 * añade su propio anunciador de rutas, también con role="alert".
 */
export function loginError(page: Page) {
  return page.locator('#login-error[role="alert"]');
}

/** Cliente service_role para preparar datos en las pruebas (solo local). */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
