import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, login, USERS } from "./fixtures";

async function createArticle(page: import("@playwright/test").Page, slug: string, category = "foundations", level = "") {
  await page.goto(`/es/admin/lessons/new?category=${category}${level ? `&level=${level}` : ""}`); await page.getByLabel("Identificador URL").fill(slug);
  if (category !== "foundations") await page.getByLabel("Nivel").selectOption({ label: level });
  await page.getByLabel("Español").nth(0).fill(`Lección ${slug}`); await page.getByLabel("English").nth(0).fill(`Lesson ${slug}`); await page.getByRole("button", { name: "Crear lección" }).click();
  await expect(page).toHaveURL(/\/es\/admin\/lessons\/[0-9a-f-]+/); return new URL(page.url()).pathname.split("/").at(-1)!;
}
async function addTextBlock(page: import("@playwright/test").Page, id: string, esText: string, enText: string) {
  await page.goto(`/es/admin/lessons/${id}?add=text`); await page.getByLabel("Español").nth(2).fill(esText); await page.getByLabel("English").nth(2).fill(enText); await page.getByRole("button", { name: "Guardar bloque" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(esText) })).toBeVisible();
}

test("admin creates a kids A1 article lesson and it appears under Niños > A1 as Borrador", async ({ page }) => {
  await login(page, USERS.admin); await page.goto("/es/admin/lessons/new?category=kids");
  await page.getByLabel("Identificador URL").fill(`kids-e2e-${Date.now()}`); await page.getByLabel("Nivel").selectOption({ label: "A1" });
  await page.getByLabel("Español").nth(0).fill("Colores para niños"); await page.getByLabel("English").nth(0).fill("Colours for children");
  await page.getByRole("button", { name: "Crear lección" }).click(); await expect(page).toHaveURL(/\/es\/admin\/lessons\/[0-9a-f-]+/);
  await page.goto("/es/admin/lessons"); await expect(page.getByRole("heading", { name: "Niños" })).toBeVisible();
});
test("a duplicate slug shows the slug_taken message on the slug field", async ({ page }) => {
  const slug = `duplicate-${Date.now()}`; await login(page, USERS.admin);
  for (const title of ["Primera", "Segunda"]) { await page.goto("/es/admin/lessons/new"); await page.getByLabel("Identificador URL").fill(slug); await page.getByLabel("Español").nth(0).fill(title); await page.getByLabel("English").nth(0).fill(title); await page.getByRole("button", { name: "Crear lección" }).click(); if (title === "Primera") await expect(page).toHaveURL(/\/es\/admin\/lessons\/[0-9a-f-]+/); }
  await expect(page.getByLabel("Identificador URL")).toHaveAttribute("aria-invalid", "true"); await expect(page.getByLabel("Identificador URL")).toHaveAccessibleDescription("Este identificador ya está en uso.");
});
test("publishing a lesson without blocks shows content_incomplete", async ({ page }) => {
  await login(page, USERS.admin); await page.goto("/es/admin/lessons/new"); await page.getByLabel("Identificador URL").fill(`empty-${Date.now()}`); await page.getByLabel("Español").nth(0).fill("Vacía"); await page.getByLabel("English").nth(0).fill("Empty"); await page.getByRole("button", { name: "Crear lección" }).click(); await page.getByRole("button", { name: "Publicar" }).click(); await expect(page.getByRole("alert")).toContainText("Completa el contenido obligatorio");
});
test("the interactive alphabet lesson shows its slug as text and has no delete button", async ({ page }) => {
  await login(page, USERS.admin); await page.goto("/es/admin/lessons"); await page.getByRole("link", { name: "El alfabeto" }).click(); await expect(page.getByText("alphabet", { exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: "Eliminar lección" })).toHaveCount(0);
});
test("moving a lesson up within adults A1 changes the order", async ({ page }) => {
  const suffix = Date.now(); await login(page, USERS.admin); await createArticle(page, `adult-${suffix}-a`, "adults", "A1"); await createArticle(page, `adult-${suffix}-b`, "adults", "A1");
  await page.goto("/es/admin/lessons"); const section = page.getByRole("region", { name: "Adultos" }); const secondRow = section.getByRole("listitem").filter({ hasText: `Lección adult-${suffix}-b` }); await expect(secondRow).toBeVisible(); await secondRow.getByRole("button", { name: /^Subir / }).click(); await page.reload(); await expect(section.getByRole("listitem").first()).toContainText(`Lección adult-${suffix}-b`);
});
test("/en/admin/lessons shows English category names", async ({ page }) => { await login(page, USERS.admin, { locale: "en" }); await page.goto("/en/admin/lessons"); await expect(page.getByRole("heading", { name: "Kids" })).toBeVisible(); });
test("lessons pages have no axe violations", async ({ page }) => { await login(page, USERS.admin); await page.goto("/es/admin/lessons"); await expectNoAxeViolations(page); });
test("admin adds text, video and quiz blocks, reorders them and publishes the lesson", async ({ page }) => {
  await login(page, USERS.admin); const id = await createArticle(page, `blocks-${Date.now()}`); await addTextBlock(page, id, "Texto inicial", "First text");
  await page.goto(`/es/admin/lessons/${id}?add=video`); await page.getByLabel("URL de YouTube").fill("https://youtu.be/dQw4w9WgXcQ"); await page.getByRole("button", { name: "Guardar bloque" }).click();
  await page.goto(`/es/admin/lessons/${id}?add=quiz`); await page.getByLabel("Español").nth(2).fill("Pregunta"); await page.getByLabel("English").nth(2).fill("Question"); await page.getByLabel("Opciones · Español").fill("Sí\nNo"); await page.getByLabel("Opciones · Inglés").fill("Yes\nNo"); await page.getByLabel(/Número de opción correcta/).fill("0"); await page.getByRole("button", { name: "Guardar bloque" }).click();
  await page.goto(`/es/admin/lessons/${id}`); await page.getByRole("button", { name: /^Subir / }).last().click(); await page.getByRole("button", { name: "Publicar" }).click(); await expect(page.getByText("Publicada")).toBeVisible();
});
test("the preview in English shows the English texts and the quiz gives feedback", async ({ page }) => {
  await login(page, USERS.admin); const id = await createArticle(page, `preview-${Date.now()}`); await addTextBlock(page, id, "Texto en español", "English preview text"); await page.goto(`/es/admin/lessons/${id}/preview?lang=en`); await expect(page.getByText("English preview text")).toBeVisible();
});
test("a quiz with the correct option out of range shows the field error", async ({ page }) => {
  await login(page, USERS.admin); const id = await createArticle(page, `quiz-error-${Date.now()}`); await page.goto(`/es/admin/lessons/${id}?add=quiz`); await page.getByLabel("Español").nth(2).fill("Pregunta"); await page.getByLabel("English").nth(2).fill("Question"); await page.getByLabel("Opciones · Español").fill("Sí\nNo"); await page.getByLabel("Opciones · Inglés").fill("Yes\nNo"); await page.getByLabel(/Número de opción correcta/).fill("2"); await page.getByRole("button", { name: "Guardar bloque" }).click(); await expect(page.getByLabel(/Número de opción correcta/)).toHaveAttribute("aria-invalid", "true");
});
test("deleting a block asks for confirmation", async ({ page }) => {
  await login(page, USERS.admin); const id = await createArticle(page, `delete-${Date.now()}`); await addTextBlock(page, id, "Texto", "Text"); await page.getByRole("button", { name: "Eliminar bloque" }).click(); await expect(page.getByRole("button", { name: "¿Seguro?" })).toBeVisible();
});
test("deleting the only block of a published lesson shows content_incomplete", async ({ page }) => {
  await login(page, USERS.admin); const id = await createArticle(page, `delete-published-${Date.now()}`); await addTextBlock(page, id, "Texto", "Text"); await page.getByRole("button", { name: "Publicar" }).click(); await page.getByRole("button", { name: "Eliminar bloque" }).click(); await page.getByRole("button", { name: "¿Seguro?" }).click(); await expect(page.getByRole("alert")).toContainText("Completa el contenido obligatorio");
});
test("admin adds an image block with alt texts and it renders in the preview", async ({ page }) => {
  await login(page, USERS.admin); const id = await createArticle(page, `image-${Date.now()}`); await page.goto(`/es/admin/lessons/${id}?add=image`);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/dXcAAAAASUVORK5CYII=", "base64"); await page.getByLabel("Seleccionar archivo").setInputFiles({ name: "tiny.png", mimeType: "image/png", buffer: png }); await expect(page.getByRole("status").filter({ hasText: "Archivo adjuntado." })).toBeVisible();
  await page.getByLabel("Español").nth(2).fill("Gato"); await page.getByLabel("English").nth(2).fill("Cat"); await page.getByRole("button", { name: "Guardar bloque" }).click(); await page.goto(`/es/admin/lessons/${id}/preview?lang=en`); await expect(page.getByAltText("Cat")).toBeVisible();
});
