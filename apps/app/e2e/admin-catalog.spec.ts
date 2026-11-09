import { expect, test, type Page } from "@playwright/test";
import { adminClient, expectNoAxeViolations, expectPath, login, SEED_IDS, USERS } from "./fixtures";

async function loginAdmin(page: Page) {
  await login(page, USERS.admin);
  await expectPath(page, "/es/admin");
}

test("admin creates a location and a program with an edition in both languages", async ({ page }) => {
  const suffix = `e2e-${Date.now()}`;
  const admin = adminClient();
  try {
    await loginAdmin(page);
    await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Catálogo" }).click();
    await expectPath(page, "/es/admin/catalog");

    // Sede
    await page.getByRole("link", { name: /Sedes/ }).click();
    await expectPath(page, "/es/admin/catalog/locations");
    const newLocation = page.getByRole("region", { name: "Nueva sede" });
    await newLocation.getByLabel("Nombre").fill(`Biblioteca ${suffix}`);
    await newLocation.getByLabel("Dirección").fill("1 Library Rd");
    await newLocation.getByRole("button", { name: "Crear sede" }).click();
    await expect(page.getByRole("heading", { level: 3, name: `Biblioteca ${suffix}` })).toBeVisible();
    // El formulario de alta vuelve vacío.
    await expect(newLocation.getByLabel("Nombre")).toHaveValue("");

    // Un domicilio con dirección se rechaza en el formulario.
    await newLocation.getByLabel("Nombre").fill(`Casa ${suffix}`);
    await newLocation.getByLabel("Tipo").selectOption("home");
    await newLocation.getByLabel("Dirección").fill("2 Private St");
    await newLocation.getByRole("button", { name: "Crear sede" }).click();
    await expect(newLocation.getByLabel("Dirección")).toHaveAttribute("aria-invalid", "true");
    await expect(newLocation.getByLabel("Nombre")).toHaveValue(`Casa ${suffix}`);

    // Programa
    await page.goto("/es/admin/catalog/programs/new");
    await page.getByLabel("Código").fill(suffix);
    await page.getByLabel("Nombre (español)").fill(`Conversación ${suffix}`);
    await page.getByLabel("Nombre (inglés)").fill(`Conversation ${suffix}`);
    await page.getByLabel("Segmento").selectOption("mature");
    await page.getByLabel("Formato").selectOption("own_group");
    await page.getByLabel("Duración (semanas)").fill("6");
    await page.getByRole("button", { name: "Crear programa" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Conversación ${suffix}`);
    await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/es\/admin\/catalog\/programs\/[0-9a-f-]{36}$/);

    // Edición
    const editions = page.getByRole("region", { name: "Ediciones" });
    await editions.getByLabel("Nombre (español)").fill("Febrero");
    await editions.getByLabel("Nombre (inglés)").fill("February");
    await editions.getByLabel("Empieza").fill("2027-02-01");
    await editions.getByLabel("Termina").fill("2027-03-15");
    await editions.getByLabel("Estado").selectOption("open");
    await editions.getByRole("button", { name: "Añadir edición" }).click();
    await expect(editions.getByRole("heading", { level: 3, name: "Febrero" })).toBeVisible();
    await expect(editions).toContainText("1 feb 2027");
    await expect(editions).toContainText("Abierta");

    // Mismo programa en inglés.
    await page.goto(page.url().replace("/es/", "/en/"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Conversation ${suffix}`);
    await expect(page.getByRole("region", { name: "Editions" }).getByRole("heading", { name: "February" })).toBeVisible();
    await expect(page.getByText("Seniors (65+) · Own group (max. 2)")).toBeVisible();
  } finally {
    await admin.from("programs").delete().eq("code", suffix);
    await admin.from("locations").delete().like("name", `%${suffix}`);
  }
});

test("the /en catalog shows English enum labels", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/en/admin/catalog/programs");
  const row = page.getByRole("row", { name: /Adults A1 \(local\)/ });
  await expect(row).toContainText("Adults (14+)");
  await expect(row).toContainText("Local group");
  await page.goto("/en/admin/catalog/locations");
  await expect(page.getByText("Library · Sunshine Coast · Active")).toBeVisible();
});

test("an edition that ends before it starts is rejected", async ({ page }) => {
  await loginAdmin(page);
  await page.goto(`/es/admin/catalog/programs/${SEED_IDS.program}`);
  const form = page.getByRole("region", { name: "Ediciones" });
  await form.getByLabel("Empieza").last().fill("2027-06-10");
  await form.getByLabel("Termina").last().fill("2027-06-01");
  await form.getByRole("button", { name: "Añadir edición" }).click();
  await expect(form.getByLabel("Termina").last()).toHaveAttribute("aria-invalid", "true");
  await expect(form.getByLabel("Termina").last()).toHaveAccessibleDescription(/fuera del rango/);
});

test("an unknown program id returns 404", async ({ page }) => {
  await loginAdmin(page);
  const missing = await page.goto("/es/admin/catalog/programs/00000000-0000-4000-8000-000000000000");
  expect(missing?.status()).toBe(404);
  const malformed = await page.goto("/es/admin/catalog/programs/not-a-uuid");
  expect(malformed?.status()).toBe(404);
});

test("catalog pages have no axe violations", async ({ page }) => {
  await loginAdmin(page);
  for (const path of [
    "/es/admin/catalog",
    "/es/admin/catalog/locations",
    "/es/admin/catalog/programs",
    "/es/admin/catalog/programs/new",
    `/en/admin/catalog/programs/${SEED_IDS.program}`,
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoAxeViolations(page);
  }
});

test("teacher cannot open the catalog admin", async ({ page }) => {
  await login(page, USERS.teacher2);
  await expectPath(page, "/es/teacher");
  await page.goto("/es/admin/catalog/programs");
  await expectPath(page, "/es/teacher");
});
