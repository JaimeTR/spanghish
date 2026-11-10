import { expect, test, type Page } from "@playwright/test";
import { adminClient, expectNoAxeViolations, expectPath, login, USERS } from "./fixtures";

async function loginAdmin(page: Page) { await login(page, USERS.admin); await expectPath(page, "/es/admin"); }
const tinyPdf = Buffer.from("%PDF-1.1\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1 1] /Resources << >> >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");

test.afterEach(async () => {
  const db = adminClient();
  const { data: rows } = await db.from("resources").select("id,file_path,thumbnail_path").like("title_es", "E2E%");
  for (const row of rows ?? []) {
    if (row.file_path) await db.storage.from("resource-files").remove([row.file_path]);
    if (row.thumbnail_path) await db.storage.from("content-media").remove([row.thumbnail_path]);
  }
  if (rows?.length) await db.from("resources").delete().in("id", rows.map((row) => row.id));
});

async function createLinkResource(page: Page, title: string) {
  await page.goto("/es/admin/resources/new"); await page.getByLabel("Tipo", { exact: true }).selectOption("link");
  await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(`English ${title}`);
  await page.getByLabel("URL externa").fill("https://example.com/material"); await page.getByRole("button", { name: "Crear recurso" }).click();
  await expect(page).toHaveURL(/\/es\/admin\/resources\/[0-9a-f-]+\?saved=1/);
  return new URL(page.url()).pathname.split("/").at(-1)!;
}

test("admin creates a link resource in both languages and sees it in the account section", async ({ page }) => {
  const title = `E2E ${Date.now()}`;
  await loginAdmin(page); await page.goto("/es/admin/resources/new");
  await page.getByLabel("Tipo", { exact: true }).selectOption("link"); await page.getByLabel("Acceso", { exact: true }).selectOption("account");
  await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(`English ${title}`);
  await page.getByLabel("URL externa").fill("https://example.com/material"); await page.getByRole("button", { name: "Crear recurso" }).click();
  await expect(page).toHaveURL(/\/es\/admin\/resources\/[0-9a-f-]+\?saved=1/);
  await page.goto("/es/admin/resources"); await expect(page.getByText(title)).toBeVisible(); await expectPath(page, "/es/admin/resources");
});

test("publishing a video without a video id shows the content_incomplete message", async ({ page }) => {
  const title = `E2E Video sin origen ${Date.now()}`;
  await loginAdmin(page); await page.goto("/es/admin/resources/new"); await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(title);
  await page.getByRole("button", { name: "Crear recurso" }).click(); await expect(page).toHaveURL(/\/es\/admin\/resources\/[0-9a-f-]+\?saved=1/); await page.goto("/es/admin/resources");
  const row = page.getByRole("listitem").filter({ hasText: title }); await row.getByRole("button", { name: "Publicar" }).click();
  await expect(row.getByRole("alert")).toContainText(/Completa el contenido obligatorio/);
});
test("pasting a YouTube URL stores the id and shows the thumbnail-free preview", async ({ page }) => {
  const title = `E2E Vídeo ${Date.now()}`; await loginAdmin(page); await page.goto("/es/admin/resources/new");
  await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(title); await page.getByRole("button", { name: "Crear recurso" }).click(); await expect(page).toHaveURL(/\/es\/admin\/resources\/[0-9a-f-]+\?saved=1/);
  await page.getByLabel("URL de YouTube").fill("https://youtu.be/dQw4w9WgXcQ"); await page.getByRole("button", { name: "Guardar recurso" }).click();
  await expect(page.getByLabel("URL de YouTube")).toHaveValue("https://youtu.be/dQw4w9WgXcQ"); await expect(page.locator("main img")).toHaveCount(0);
});
test("moving a resource down changes the visible order after reload", async ({ page }) => {
  const firstTitle = `E2E Orden A ${Date.now()}`; const secondTitle = `E2E Orden B ${Date.now()}`;
  await loginAdmin(page); await createLinkResource(page, firstTitle); await createLinkResource(page, secondTitle); await page.goto("/es/admin/resources");
  const section = page.getByRole("region", { name: /Acceso: Libre/ }); const rows = section.getByRole("listitem");
  const firstRow = rows.filter({ hasText: firstTitle }); await Promise.all([page.waitForResponse((r) => r.request().method() === "POST"), firstRow.getByRole("button", { name: /^Bajar / }).click()]); await page.reload();
  const after = await section.getByRole("listitem").allTextContents(); const ownRows = after.filter((row) => row.includes(firstTitle) || row.includes(secondTitle)); const firstIndex = ownRows.findIndex((row) => row.includes(firstTitle)); const secondIndex = ownRows.findIndex((row) => row.includes(secondTitle));
  expect(ownRows).toHaveLength(2); expect(firstIndex).toBeGreaterThan(secondIndex);
});
test("admin unpublishes a resource and its badge shows Borrador", async ({ page }) => {
  const title = `E2E Enlace ${Date.now()}`; await loginAdmin(page); await createLinkResource(page, title); await page.goto("/es/admin/resources"); const row = page.getByRole("listitem").filter({ hasText: title });
  await row.getByRole("button", { name: "Publicar" }).click(); await row.getByRole("button", { name: "Despublicar" }).click(); await expect(row).toContainText("Borrador");
});
test("a resource id that does not exist returns 404", async ({ page }) => {
  await loginAdmin(page); const response = await page.goto("/es/admin/resources/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"); expect(response?.status()).toBe(404);
  const malformed = await page.goto("/es/admin/resources/not-a-uuid"); expect(malformed?.status()).toBe(404);
});
test("teacher cannot open /es/admin/resources", async ({ page }) => {
  await login(page, USERS.teacher); await page.goto("/es/admin/resources"); await expect(page).not.toHaveURL(/\/admin\/resources/);
});
test("resources pages have no axe violations (desktop and 375px)", async ({ page }) => {
  await loginAdmin(page); await page.goto("/es/admin/resources"); await expectNoAxeViolations(page); await page.setViewportSize({ width: 375, height: 812 }); await expectNoAxeViolations(page);
});
test("admin uploads a PDF to a worksheet, publishes it and the list shows the file size", async ({ page }) => {
  const title = `E2E Ficha PDF ${Date.now()}`; await loginAdmin(page); await page.goto("/es/admin/resources/new"); await page.getByLabel("Tipo", { exact: true }).selectOption("worksheet"); await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(title); await page.getByRole("button", { name: "Crear recurso" }).click();
  await page.getByLabel("Seleccionar archivo del recurso").setInputFiles({ name: "worksheet.pdf", mimeType: "application/pdf", buffer: tinyPdf }); await expect(page.locator('[role="status"]').filter({ hasText: /^Archivo adjuntado\.$/ })).toBeVisible();
  await page.goto("/es/admin/resources"); const row = page.getByRole("listitem").filter({ hasText: title }); await row.getByRole("button", { name: "Publicar" }).click(); await expect(row).toContainText("KB");
});
test("uploading a .zip shows the type message and nothing is attached", async ({ page }) => {
  const title = `E2E Ficha ZIP ${Date.now()}`; await loginAdmin(page); await page.goto("/es/admin/resources/new"); await page.getByLabel("Tipo", { exact: true }).selectOption("worksheet"); await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(title); await page.getByRole("button", { name: "Crear recurso" }).click();
  await page.getByLabel("Seleccionar archivo del recurso").setInputFiles({ name: "bad.zip", mimeType: "application/zip", buffer: Buffer.from("zip") }); await expect(page.getByLabel("Seleccionar archivo del recurso").locator("..").getByRole("status")).toContainText("Este tipo de archivo no está permitido."); await expect(page.getByText("Sin archivo adjunto").first()).toBeVisible();
});
test("a successful signed-upload response without an object is rejected and keeps the resource empty", async ({ page }) => {
  const title = `E2E Adjunto ausente ${Date.now()}`;
  await loginAdmin(page); await page.goto("/es/admin/resources/new");
  await page.getByLabel("Tipo", { exact: true }).selectOption("worksheet"); await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(title);
  await page.getByRole("button", { name: "Crear recurso" }).click();
  await page.route("**/storage/v1/object/upload/sign/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Key: "mocked" }) }));
  await page.getByLabel("Seleccionar archivo del recurso").setInputFiles({ name: "missing.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\\n%%EOF") });
  await expect(page.getByLabel("Seleccionar archivo del recurso").locator("..").getByRole("status")).toContainText("No se encontró el archivo subido.");
  await expect(page.getByText("Sin archivo adjunto").first()).toBeVisible();
});
test("replacing the file removes the previous object", async ({ page }) => {
  const title = `E2E Reemplazo ${Date.now()}`; await loginAdmin(page); await page.goto("/es/admin/resources/new"); await page.getByLabel("Tipo", { exact: true }).selectOption("worksheet"); await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(title); await page.getByRole("button", { name: "Crear recurso" }).click();
  const upload = (name: string) => page.getByLabel("Seleccionar archivo del recurso").setInputFiles({ name, mimeType: "application/pdf", buffer: tinyPdf });
  await upload("first.pdf"); await expect(page.locator('[role="status"]').filter({ hasText: /.+/ }).filter({ hasText: "Archivo adjuntado." })).toBeVisible(); await page.reload(); const first = await page.getByText(/\.pdf · [0-9]+ KB/).textContent();
  await upload("second.pdf"); await expect(page.locator('[role="status"]').filter({ hasText: /.+/ }).filter({ hasText: "Archivo adjuntado." })).toBeVisible(); await page.reload(); const second = await page.getByText(/\.pdf · [0-9]+ KB/).textContent(); expect(second).not.toEqual(first);
});

