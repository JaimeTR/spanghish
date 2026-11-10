// SOLO DESARROLLO LOCAL: usuarios creados por supabase/seed.sql.
import type { Database } from "@spanglish/db";
import { createClient } from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const DEV_PASSWORD = "Spanglish-dev-2026";

export const USERS = {
  admin: "admin@spanglish.test",
  teacher: "teacher@spanglish.test",
  student: "student@spanglish.test",
  suspended: "suspended@spanglish.test",
  teacher2: "teacher2@spanglish.test",
  guardian: "guardian@spanglish.test",
  /** Rol student sin ficha de alumno: nivel de contenido "account". */
  visitor: "visitor@spanglish.test",
} as const;

/** IDs fijos de supabase/seed.sql (catálogo y personas). */
export const SEED_IDS = {
  locations: {
    library: "b0000000-0000-4000-8000-000000000001",
    online: "b0000000-0000-4000-8000-000000000002",
  },
  program: "b0000000-0000-4000-8000-000000000101",
  edition: "b0000000-0000-4000-8000-000000000201",
  prices: {
    perLesson: "b0000000-0000-4000-8000-000000000301",
    editionUpfront: "b0000000-0000-4000-8000-000000000302",
  },
  students: {
    local: "b0000000-0000-4000-8000-000000000401",
    two: "b0000000-0000-4000-8000-000000000402",
  },
  guardian: "b0000000-0000-4000-8000-000000000501",
  consentText: "minor_data-v1",
} as const;

/** Contenido de desarrollo de supabase/seed.sql (0010). */
export const SEED_CONTENT = {
  resources: {
    publicLink: "c0000000-0000-4000-8000-000000000001",
    accountLink: "c0000000-0000-4000-8000-000000000002",
    enrolledVideo: "c0000000-0000-4000-8000-000000000003",
    draftWorksheet: "c0000000-0000-4000-8000-000000000004",
  },
  lessons: {
    public: { id: "c0000000-0000-4000-8000-000000000021", slug: "colores-local" },
    account: { id: "c0000000-0000-4000-8000-000000000022", slug: "saludos-local" },
    enrolled: { id: "c0000000-0000-4000-8000-000000000023", slug: "preterito-local" },
    draft: { id: "c0000000-0000-4000-8000-000000000024", slug: "borrador-local" },
  },
} as const;

/** WCAG 2.2 AA con axe (mismas reglas que shell.spec.ts). */
export async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

export async function login(
  page: Page,
  email: string,
  { locale = "es", next, password = DEV_PASSWORD }: { locale?: string; next?: string; password?: string } = {},
) {
  const query = next === undefined ? "" : `?next=${encodeURIComponent(next)}`;
  await page.goto(`/${locale}/login${query}`);
  await page.getByLabel(locale === "en" ? "Email" : "Correo electrónico").fill(email);
  await page.getByLabel(locale === "en" ? "Password" : "Contraseña", { exact: true }).fill(password);
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
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Cierra sesión desde el menú de la cuenta (escritorio) o el menú móvil. */
export async function signOut(page: Page) {
  const button = page.getByRole("button", { name: "Cerrar sesión" });
  if (!(await button.first().isVisible())) {
    const account = page.getByTestId("user-menu-trigger");
    if (await account.isVisible()) await account.click();
    else await page.getByRole("button", { name: "Menú" }).click();
  }
  await button.first().click();
}
