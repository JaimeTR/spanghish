import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { adminClient, expectNoAxeViolations, expectPath, login, USERS } from "./fixtures";

const db = adminClient(); const lessons: string[] = [];
async function createArticle(slug: string, access: "account" | "enrolled") {
  const id = randomUUID(); const { data: level } = await db.from("levels").select("id").eq("language_code", "es").eq("code", "A1").single();
  if (!level) throw new Error("No existe nivel A1");
  const { error } = await db.from("lessons").insert({ id, slug, category: "adults", level_id: level.id, title_es: slug, title_en: slug, summary_es: "e2e-resumen", summary_en: "e2e-summary", access_level: access, kind: "article", status: "published" });
  if (error) throw error;
  const { error: blockError } = await db.from("lesson_blocks").insert({ lesson_id: id, position: 10, kind: "text", body_es: "Texto de prueba", body_en: "Test text" });
  if (blockError) { await db.from("lessons").delete().eq("id", id); throw blockError; }
  lessons.push(id); return slug;
}

test.afterEach(async () => { for (const id of lessons.splice(0)) await db.from("lessons").delete().eq("id", id); });

test("visitor opens an account article and sees its blocks", async ({ page }) => {
  const slug = await createArticle(`e2e-leccion-cuenta-${randomUUID().slice(0, 8)}`, "account");
  await login(page, USERS.visitor); await expectPath(page, "/es/student"); await page.goto("/es/student/learn");
  await page.getByRole("link", { name: new RegExp(slug) }).click();
  await expectPath(page, `/es/student/learn/${slug}`); await expect(page.getByText("Texto de prueba")).toBeVisible();
});

test("visitor gets 404 on an enrolled article URL", async ({ page }) => {
  const slug = await createArticle(`e2e-leccion-alumno-${randomUUID().slice(0, 8)}`, "enrolled");
  await login(page, USERS.visitor); await expectPath(page, "/es/student");
  const response = await page.goto(`/es/student/learn/${slug}`); expect(response?.status()).toBe(404);
});

test("student opens an enrolled article and the interactive alphabet links to the public site", async ({ page }) => {
  const slug = await createArticle(`e2e-leccion-matricula-${randomUUID().slice(0, 8)}`, "enrolled");
  await login(page, USERS.student); await expectPath(page, "/es/student"); await page.goto("/es/student/learn");
  await page.getByRole("link", { name: new RegExp(slug) }).click(); await expect(page.getByText("Texto de prueba")).toBeVisible();
  await page.goto("/es/student/learn");
  if (process.env.NEXT_PUBLIC_WEB_URL) await expect(page.getByRole("link", { name: /El alfabeto/ })).toHaveAttribute("href", /\/es\/learn\/alphabet$/);
  else await expect(page.getByText("El alfabeto")).toBeVisible();
});

test("learn pages have no axe violations on desktop and mobile", async ({ page }) => {
  await login(page, USERS.visitor); await expectPath(page, "/es/student");
  for (const width of [1280, 375]) { await page.setViewportSize({ width, height: 900 }); await page.goto("/es/student/learn"); await expectNoAxeViolations(page); }
});
