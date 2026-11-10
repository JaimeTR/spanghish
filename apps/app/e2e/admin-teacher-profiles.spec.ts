import { expect, test, type Page } from "@playwright/test";
import { adminClient, expectNoAxeViolations, expectPath, login, USERS } from "./fixtures";

// PNG 1x1 válido (el navegador lo decodifica para medirlo).
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const REQUIRED_PAIRS = ["Texto alternativo de la foto", "Rol", "Frase destacada", "Descripción SEO", "Introducción", "Biografía"];

async function loginAdmin(page: Page) {
  await login(page, USERS.admin);
  await expectPath(page, "/es/admin");
}

/** Rellena un campo bilingüe: el grupo se llama como su leyenda y dentro hay "Español" y "English". */
async function fillPair(page: Page, legend: string, es: string, en: string) {
  const group = page.getByRole("group", { name: legend, exact: true });
  await group.getByLabel("Español").fill(es);
  await group.getByLabel("English").fill(en);
}

async function fillNewProfile(page: Page, slug: string, name: string) {
  await page.goto("/es/admin/teachers/profiles/new");
  await page.getByLabel("Identificador URL").fill(slug);
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  for (const legend of REQUIRED_PAIRS) await fillPair(page, legend, `${legend} ${slug}`, `EN ${legend} ${slug}`);
}

async function createProfile(page: Page, slug: string, name = `E2E Docente ${slug}`) {
  await fillNewProfile(page, slug, name);
  await page.getByRole("button", { name: "Crear perfil" }).click();
  await expect(page).toHaveURL(/\/es\/admin\/teachers\/profiles\/[0-9a-f-]+\?saved=1/);
}

test.afterEach(async () => {
  const db = adminClient();
  const { data } = await db.from("teacher_profiles").select("id,photo_path").like("slug", "e2e-%");
  for (const row of data ?? []) if (row.photo_path) await db.storage.from("content-media").remove([row.photo_path]);
  if (data?.length) await db.from("teacher_profiles").delete().in("id", data.map((r) => r.id));
});

test("admin creates a bilingual teacher profile and sees it as a draft in the list", async ({ page }) => {
  const slug = `e2e-${Date.now()}`;
  await loginAdmin(page);
  await createProfile(page, slug);
  await page.goto("/es/admin/teachers/profiles");
  const row = page.getByRole("listitem").filter({ hasText: `E2E Docente ${slug}` });
  await expect(row).toContainText("Borrador");
});

test("a duplicate slug shows the error on the slug field", async ({ page }) => {
  const slug = `e2e-${Date.now()}`;
  await loginAdmin(page);
  await createProfile(page, slug);
  await fillNewProfile(page, slug, "Otra persona");
  await page.getByRole("button", { name: "Crear perfil" }).click();
  const field = page.getByLabel("Identificador URL");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/profiles\?new=1/);
});

test("publishes and unpublishes a teacher profile", async ({ page }) => {
  const slug = `e2e-${Date.now()}`;
  await loginAdmin(page);
  await createProfile(page, slug);
  await page.goto("/es/admin/teachers/profiles");
  const row = page.getByRole("listitem").filter({ hasText: slug });
  await row.getByRole("button", { name: "Publicar" }).click();
  await expect(row).toContainText("Publicado");
  await row.getByRole("button", { name: "Despublicar" }).click();
  await expect(row).toContainText("Borrador");
});

test("moving a profile down changes its order", async ({ page }) => {
  const suffix = Date.now();
  await loginAdmin(page);
  await createProfile(page, `e2e-${suffix}-a`, `E2E Primera ${suffix}`);
  await createProfile(page, `e2e-${suffix}-b`, `E2E Segunda ${suffix}`);
  await page.goto("/es/admin/teachers/profiles");
  const first = page.getByRole("listitem").filter({ hasText: `E2E Primera ${suffix}` });
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    first.getByRole("button", { name: /^Bajar / }).click(),
  ]);
  await page.reload();
  const texts = await page.getByRole("listitem").allTextContents();
  const own = texts.filter((t) => t.includes(`E2E Primera ${suffix}`) || t.includes(`E2E Segunda ${suffix}`));
  expect(own).toHaveLength(2);
  expect(own[0]).toContain(`E2E Segunda ${suffix}`);
});

test("uploads a PNG teacher photo", async ({ page }) => {
  const slug = `e2e-${Date.now()}`;
  await loginAdmin(page);
  await createProfile(page, slug);
  await page.getByLabel("Seleccionar foto del perfil").setInputFiles({ name: "tiny.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("status").filter({ hasText: "Archivo adjuntado." })).toBeVisible();
});

test("invalid and missing profile ids return 404", async ({ page }) => {
  await loginAdmin(page);
  expect((await page.goto("/es/admin/teachers/profiles/not-a-uuid"))?.status()).toBe(404);
  expect((await page.goto("/es/admin/teachers/profiles/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"))?.status()).toBe(404);
});

test("a teacher cannot open the public profile admin", async ({ page }) => {
  await login(page, USERS.teacher);
  await page.goto("/es/admin/teachers/profiles");
  await expect(page).not.toHaveURL(/\/admin\/teachers\/profiles/);
});

test("profile pages have no axe violations (desktop and 375px)", async ({ page }) => {
  await loginAdmin(page);
  for (const path of ["/es/admin/teachers/profiles", "/es/admin/teachers/profiles/new"]) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    // El alta abre un modal tras hidratar: se espera a que esté a la vista antes de analizar.
    if (path.endsWith("/new")) await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await expectNoAxeViolations(page);
  }
});
