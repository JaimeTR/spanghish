import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { adminClient, expectPath, login, SEED_CONTENT, signOut, USERS } from "./fixtures";

/**
 * El recorrido de la demo de punta a punta, encadenando lo que las demás
 * suites prueban por separado: la administradora publica, cada nivel de acceso
 * ve lo suyo, y lo publicado como "libre" llega a un visitante anónimo (que es
 * como lee la web pública).
 */
const db = adminClient();
const TITLE = `E2E Demo ${Date.now()}`;
const lessons: string[] = [];

/** Cliente anónimo, sin sesión: lo mismo que usa la web pública. */
function anonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resourceRow(page: Page, title: string) {
  await page.goto("/es/admin/resources");
  return page.getByRole("listitem").filter({ hasText: title });
}

test.afterAll(async () => {
  const { data: rows } = await db.from("resources").select("id").like("title_es", "E2E Demo%");
  if (rows?.length) await db.from("resources").delete().in("id", rows.map((row) => row.id));
  for (const id of lessons.splice(0)) await db.from("lessons").delete().eq("id", id);
});

test("admin publishes an account-level resource; the visitor sees it unlocked; unpublishing removes it", async ({ page }) => {
  await login(page, USERS.admin);
  await expectPath(page, "/es/admin");
  await page.goto("/es/admin/resources/new");
  await page.getByLabel("Tipo", { exact: true }).selectOption("link");
  await page.getByLabel("Acceso", { exact: true }).selectOption("account");
  await page.getByLabel("Español").nth(0).fill(TITLE);
  await page.getByLabel("English").nth(0).fill(`English ${TITLE}`);
  await page.getByLabel("URL externa").fill("https://example.com/demo");
  await page.getByRole("button", { name: "Crear recurso" }).click();
  await expect(page).toHaveURL(/\/es\/admin\/resources\/[0-9a-f-]+\?saved=1/);
  const row = await resourceRow(page, TITLE);
  await row.getByRole("button", { name: "Publicar" }).click();
  await expect(row.getByRole("button", { name: "Despublicar" })).toBeVisible();

  // Un anónimo (la web pública) lo recibe con candado y sin su origen.
  const { data: published } = await anonClient().rpc("list_published_resources");
  const teaser = (published as { title_es: string; locked: boolean; external_url: string | null }[]).find((r) => r.title_es === TITLE);
  expect(teaser).toMatchObject({ locked: true, external_url: null });

  await signOut(page);
  await login(page, USERS.visitor);
  await expectPath(page, "/es/student");
  await page.goto("/es/student/resources");
  await expect(page.getByText("Tu acceso: Con cuenta")).toBeVisible();
  const card = page.locator("article").filter({ has: page.getByRole("heading", { name: TITLE }) });
  await expect(card).toBeVisible();
  await expect(card.getByText("Disponible para alumnos matriculados")).toHaveCount(0);

  await signOut(page);
  await login(page, USERS.admin);
  await expectPath(page, "/es/admin");
  const again = await resourceRow(page, TITLE);
  await again.getByRole("button", { name: "Despublicar" }).click();
  await expect(again).toContainText("Borrador");

  await signOut(page);
  await login(page, USERS.visitor);
  await expectPath(page, "/es/student");
  await page.goto("/es/student/resources");
  await expect(page.getByText("Tu acceso: Con cuenta")).toBeVisible();
  await expect(page.getByRole("heading", { name: TITLE })).toHaveCount(0);
});

test("an enrolled resource is locked for the visitor and unlocked for the student", async ({ page }) => {
  await login(page, USERS.visitor);
  await expectPath(page, "/es/student");
  await page.goto("/es/student/resources");
  const locked = page.locator("article").filter({ has: page.getByRole("heading", { name: "Video para alumnos (local)" }) });
  await expect(locked.getByText("Disponible para alumnos matriculados")).toBeVisible();

  await signOut(page);
  await login(page, USERS.student);
  await expectPath(page, "/es/student");
  await page.goto("/es/student/resources");
  await expect(page.getByText("Tu acceso: Alumno")).toBeVisible();
  const open = page.locator("article").filter({ has: page.getByRole("heading", { name: "Video para alumnos (local)" }) });
  await expect(open).toBeVisible();
  await expect(open.getByText("Disponible para alumnos matriculados")).toHaveCount(0);
});

test("a published public lesson reaches an anonymous visitor; restricted ones arrive as locked teasers", async () => {
  const id = randomUUID();
  const slug = `e2e-demo-${id.slice(0, 8)}`;
  lessons.push(id);
  const insert = await db.from("lessons").insert({ id, slug, category: "foundations", title_es: "E2E Demo lección", title_en: "E2E Demo lesson", access_level: "public", kind: "article", status: "draft", sort_order: 9000 });
  if (insert.error) throw insert.error;
  const anon = anonClient();

  // En borrador no existe para un anónimo.
  const draft = await anon.rpc("list_published_lessons");
  expect((draft.data as { slug: string }[]).some((row) => row.slug === slug)).toBe(false);

  const block = await db.from("lesson_blocks").insert({ lesson_id: id, position: 10, kind: "text", body_es: "Hola", body_en: "Hello" });
  if (block.error) throw block.error;
  const publish = await db.from("lessons").update({ status: "published" }).eq("id", id);
  if (publish.error) throw publish.error;

  const list = await anon.rpc("list_published_lessons");
  const rows = list.data as { slug: string; locked: boolean }[];
  expect(rows.find((row) => row.slug === slug)).toMatchObject({ locked: false });
  expect(rows.find((row) => row.slug === SEED_CONTENT.lessons.account.slug)).toMatchObject({ locked: true });
  expect(rows.some((row) => row.slug === SEED_CONTENT.lessons.draft.slug)).toBe(false);

  const detail = await anon.rpc("get_published_lesson", { p_slug: slug });
  expect((detail.data as { blocks: unknown[] }).blocks).toHaveLength(1);
  const restricted = await anon.rpc("get_published_lesson", { p_slug: SEED_CONTENT.lessons.enrolled.slug });
  expect(restricted.data).toBeNull();
  // Sin privilegios de tabla: un anónimo no lee las lecciones directamente.
  const direct = await anon.from("lessons").select("id");
  expect(direct.data ?? []).toHaveLength(0);
});

test("the portal reports its health and is never indexable", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(health.headers()["cache-control"]).toBe("no-store");
  expect(await health.json()).toEqual({ status: "ok", app: "app", commit: null, indexing: false, db: "ok" });

  for (const path of ["/es/login", "/api/health"]) {
    expect((await request.get(path)).headers()["x-robots-tag"], path).toBe("noindex, nofollow");
  }
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \//);
});
