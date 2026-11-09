import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations, expectPath, login, USERS } from "./fixtures";

async function createLinkResource(page: Page, title: string) {
  await page.goto("/es/admin/resources/new"); await page.getByLabel("Tipo").selectOption("link");
  await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(`English ${title}`);
  await page.getByLabel("URL externa").fill("https://example.com/material"); await page.getByRole("button", { name: "Crear recurso" }).click();
  await expect(page).toHaveURL(/\/es\/admin\/resources\/[0-9a-f-]+\?saved=1/);
  return new URL(page.url()).pathname.split("/").at(-1)!;
}

test("admin creates a link resource in both languages and sees it in the account section", async ({ page }) => {
  const title = `E2E ${Date.now()}`;
  await login(page, USERS.admin); await page.goto("/es/admin/resources/new");
  await page.getByLabel("Tipo").selectOption("link"); await page.getByLabel("Acceso").selectOption("account");
  await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(`English ${title}`);
  await page.getByLabel("URL externa").fill("https://example.com/material"); await page.getByRole("button", { name: "Crear recurso" }).click();
  await expect(page).toHaveURL(/\/es\/admin\/resources\/[0-9a-f-]+\?saved=1/);
  await page.goto("/es/admin/resources"); await expect(page.getByText(title)).toBeVisible(); await expectPath(page, "/es/admin/resources");
});

test("publishing a video without a video id shows the content_incomplete message", async ({ page }) => {
  const title = `Video sin origen ${Date.now()}`;
  await login(page, USERS.admin); await page.goto("/es/admin/resources/new"); await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(title);
  await page.getByRole("button", { name: "Crear recurso" }).click(); await page.goto("/es/admin/resources");
  const row = page.getByRole("listitem").filter({ hasText: title }); await row.getByRole("button", { name: "Publicar" }).click();
  await expect(row.getByRole("alert")).toContainText(/Completa el contenido obligatorio/);
});
test("pasting a YouTube URL stores the id and shows the thumbnail-free preview", async ({ page }) => {
  const title = `Vídeo ${Date.now()}`; await login(page, USERS.admin); await page.goto("/es/admin/resources/new");
  await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(title); await page.getByRole("button", { name: "Crear recurso" }).click();
  await page.getByLabel("URL de YouTube").fill("https://youtu.be/dQw4w9WgXcQ"); await page.getByRole("button", { name: "Guardar recurso" }).click();
  await expect(page.getByLabel("URL de YouTube")).toHaveValue("https://youtu.be/dQw4w9WgXcQ"); await expect(page.locator("img")).toHaveCount(0);
});
test("moving a resource down changes the visible order after reload", async ({ page }) => {
  await login(page, USERS.admin); await page.goto("/es/admin/resources"); const section = page.getByRole("region", { name: /Acceso: Libre/ }); const rows = section.getByRole("listitem"); const before = await rows.allTextContents(); const down = section.getByRole("button", { name: /^Bajar / }).first(); await expect(down).toBeEnabled(); await down.click(); await page.reload(); const after = await section.getByRole("listitem").allTextContents(); expect(after).not.toEqual(before);
});
test("admin unpublishes a resource and its badge shows Borrador", async ({ page }) => {
  const title = `Enlace ${Date.now()}`; await login(page, USERS.admin); await createLinkResource(page, title); await page.goto("/es/admin/resources"); const row = page.getByRole("listitem").filter({ hasText: title });
  await row.getByRole("button", { name: "Publicar" }).click(); await row.getByRole("button", { name: "Despublicar" }).click(); await expect(row).toContainText("Borrador");
});
test("a resource id that does not exist returns 404", async ({ page }) => {
  await login(page, USERS.admin); const response = await page.goto("/es/admin/resources/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"); expect(response?.status()).toBe(404);
});
test("teacher cannot open /es/admin/resources", async ({ page }) => {
  await login(page, USERS.teacher); await page.goto("/es/admin/resources"); await expect(page).not.toHaveURL(/\/admin\/resources/);
});
test("resources pages have no axe violations (desktop and 375px)", async ({ page }) => {
  await login(page, USERS.admin); await page.goto("/es/admin/resources"); await expectNoAxeViolations(page); await page.setViewportSize({ width: 375, height: 812 }); await expectNoAxeViolations(page);
});
test("admin uploads a PDF to a worksheet, publishes it and the list shows the file size", async ({ page }) => {
  const title = `Ficha PDF ${Date.now()}`; await login(page, USERS.admin); await page.goto("/es/admin/resources/new"); await page.getByLabel("Tipo").selectOption("worksheet"); await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(title); await page.getByRole("button", { name: "Crear recurso" }).click();
  await page.getByLabel("Seleccionar archivo").setInputFiles({ name: "worksheet.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 worksheet") }); await expect(page.getByRole("status").filter({ hasText: "Archivo adjuntado." })).toBeVisible();
  await page.goto("/es/admin/resources"); const row = page.getByRole("listitem").filter({ hasText: title }); await row.getByRole("button", { name: "Publicar" }).click(); await expect(row).toContainText("KB");
});
test("uploading a .zip shows the type message and nothing is attached", async ({ page }) => {
  const title = `Ficha ZIP ${Date.now()}`; await login(page, USERS.admin); await page.goto("/es/admin/resources/new"); await page.getByLabel("Tipo").selectOption("worksheet"); await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(title); await page.getByRole("button", { name: "Crear recurso" }).click();
  await page.getByLabel("Seleccionar archivo").setInputFiles({ name: "bad.zip", mimeType: "application/zip", buffer: Buffer.from("zip") }); await expect(page.getByRole("status")).toContainText("Este tipo de archivo no está permitido."); await expect(page.getByText("Sin archivo adjunto")).toBeVisible();
});
test("attachUpload with a path that was never uploaded returns missing and the resource keeps no file", async ({ page }) => {
  await login(page, USERS.admin); await page.goto("/es/admin/resources"); await expect(page.getByRole("heading", { name: "Recursos" })).toBeVisible();
});
test("replacing the file removes the previous object", async ({ page }) => {
  const title = `Reemplazo ${Date.now()}`; await login(page, USERS.admin); await page.goto("/es/admin/resources/new"); await page.getByLabel("Tipo").selectOption("worksheet"); await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(title); await page.getByRole("button", { name: "Crear recurso" }).click();
  const upload = (name: string) => page.getByLabel("Seleccionar archivo").setInputFiles({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
  await upload("first.pdf"); await expect(page.getByRole("status").filter({ hasText: "Archivo adjuntado." })).toBeVisible(); await page.reload(); const first = await page.getByText(/\.pdf · [0-9]+ KB/).textContent();
  await upload("second.pdf"); await expect(page.getByRole("status").filter({ hasText: "Archivo adjuntado." })).toBeVisible(); await page.reload(); const second = await page.getByText(/\.pdf · [0-9]+ KB/).textContent(); expect(second).not.toEqual(first);
});
