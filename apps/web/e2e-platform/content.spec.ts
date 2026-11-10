import { expect, test } from "@playwright/test";
import {
  E2E,
  expectPageEventually,
  remove,
  removeResourceFile,
  revalidate,
  SEED,
  SUPABASE_URL,
  tinyPdf,
  update,
  uploadResourceFile,
  upsert,
} from "./helpers";

const FILE_PATH = `resources/${E2E.worksheet}/${E2E.worksheetFile}.pdf`;
const LITERAL = "<img src=x onerror=alert(1)>";

async function cleanUp() {
  await remove("lessons", E2E.lesson);
  await remove("resources", E2E.worksheet);
  await removeResourceFile(FILE_PATH);
}

test.beforeAll(cleanUp);
test.afterAll(cleanUp);

test("learn hub lists the public article and links the restricted ones to the portal login with next", async ({ page }) => {
  await page.goto("/es/learn");
  const lessons = page.locator("#lessons");
  await expect(lessons.getByRole("link", { name: /El alfabeto/ })).toHaveAttribute("href", "/es/learn/alphabet");
  await expect(lessons.getByRole("link", { name: /Nivel A1: Los colores/ })).toHaveAttribute("href", `/es/learn/${SEED.lessons.public}`);

  const account = lessons.getByRole("link", { name: /Nivel A1: Saludos/ });
  await expect(account).toContainText("Entra para verla");
  const href = (await account.getAttribute("href"))!;
  expect(new URL(href).pathname).toBe("/es/login");
  expect(new URL(href).searchParams.get("next")).toBe(`/es/student/learn/${SEED.lessons.account}`);
  expect(new URL((await lessons.getByRole("link", { name: /Nivel B1: El pretérito/ }).getAttribute("href"))!).searchParams.get("next")).toBe(
    `/es/student/learn/${SEED.lessons.enrolled}`,
  );
  // Los niveles sin lecciones conservan su hueco.
  expect(await lessons.getByText("Próximamente", { exact: true }).count()).toBeGreaterThan(15);
});

test("a restricted or unknown lesson is a 404 on the web", async ({ request }) => {
  for (const slug of [SEED.lessons.account, SEED.lessons.enrolled, "no-existe"]) {
    expect((await request.get(`/es/learn/${slug}`)).status(), slug).toBe(404);
  }
});

test("an article lesson renders its blocks and the quiz gives feedback", async ({ page }) => {
  await page.goto(`/es/learn/${SEED.lessons.public}`);
  await expect(page).toHaveTitle(/^Los colores · Aprende ahora · Spanglish$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/es/learn/${SEED.lessons.public}$`));
  const lesson = page.locator("#lesson");
  await expect(lesson.getByRole("listitem").first()).toBeVisible();

  const quiz = lesson.getByRole("group").first();
  await quiz.getByRole("button", { name: "Comprobar" }).click();
  await expect(quiz.getByRole("status")).toHaveText("Elige una respuesta.");
  await quiz.getByRole("radio").nth(1).check();
  await quiz.getByRole("button", { name: "Comprobar" }).click();
  await expect(quiz.getByRole("status")).toContainText("No es correcto");
  await quiz.getByRole("radio").first().check();
  await quiz.getByRole("button", { name: "Comprobar" }).click();
  await expect(quiz.getByRole("status")).toContainText("¡Correcto!");

  await page.goto(`/en/learn/${SEED.lessons.public}`);
  await expect(page).toHaveTitle(/^Colours · Learn now · Spanglish$/);
});

test("POST /api/revalidate makes a newly published lesson visible; its text is literal, never HTML", async ({ page, request }) => {
  expect((await request.get(`/es/learn/${E2E.lessonSlug}`)).status()).toBe(404);
  await expectPageEventually(request, "/es/learn", "Lección e2e de la web", false);

  await upsert("lessons", [
    {
      id: E2E.lesson,
      slug: E2E.lessonSlug,
      kind: "article",
      category: "foundations",
      title_es: "Lección e2e de la web",
      title_en: "Web e2e lesson",
      access_level: "public",
      status: "draft",
      sort_order: 9000,
    },
  ]);
  await upsert("lesson_blocks", [
    { lesson_id: E2E.lesson, position: 1, kind: "text", body_es: `Texto con ${LITERAL} y **negrita**`, body_en: "Text" },
  ]);
  await update("lessons", E2E.lesson, { status: "published" });

  await revalidate(request);
  await expectPageEventually(request, "/es/learn", "Lección e2e de la web");
  await expect.poll(async () => (await request.get(`/es/learn/${E2E.lessonSlug}`)).status(), { timeout: 20_000 }).toBe(200);

  let dialogs = 0;
  page.on("dialog", (dialog) => {
    dialogs += 1;
    void dialog.dismiss();
  });
  await page.goto(`/es/learn/${E2E.lessonSlug}`);
  const lesson = page.locator("#lesson");
  await expect(lesson).toContainText(LITERAL);
  await expect(lesson.locator("img")).toHaveCount(0);
  await expect(lesson.locator("strong")).toHaveText("negrita");
  expect(dialogs).toBe(0);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`/es/learn/${SEED.lessons.public}`);
  expect(sitemap).not.toContain(SEED.lessons.account);

  // Despublicar la retira del menú.
  await update("lessons", E2E.lesson, { status: "draft" });
  await revalidate(request);
  await expectPageEventually(request, "/es/learn", "Lección e2e de la web", false);
});

test("resources page shows platform cards per tier and the public worksheet redirects to a signed URL", async ({ page, request }) => {
  await uploadResourceFile(FILE_PATH, tinyPdf(), "application/pdf");
  await upsert("resources", [
    {
      id: E2E.worksheet,
      kind: "worksheet",
      access_level: "public",
      status: "published",
      title_es: "Ficha e2e de la web",
      title_en: "Web e2e worksheet",
      sort_order: 9000,
      file_path: FILE_PATH,
      file_mime: "application/pdf",
      file_size_bytes: tinyPdf().byteLength,
    },
  ]);
  await revalidate(request);
  await expectPageEventually(request, "/es/resources", "Ficha e2e de la web");

  await page.goto("/es/resources");
  const access = page.locator("#access");
  // Libre: enlace externo con aviso de pestaña nueva, y la ficha por la ruta firmada de la web.
  const external = access.getByRole("link", { name: /Diccionario de la RAE/ });
  await expect(external).toHaveAttribute("target", "_blank");
  await expect(external).toHaveAttribute("rel", "noopener noreferrer");
  await expect(external).toContainText("se abre en una pestaña nueva");
  await expect(access.getByRole("link", { name: /Ficha e2e de la web/ })).toHaveAttribute("href", `/api/resource-file/${E2E.worksheet}`);

  // Con cuenta y solo alumnos: candado al login del portal, sin rastro del origen.
  for (const name of ["Conjugador de verbos (local)", "Video para alumnos (local)"]) {
    const href = (await access.getByRole("link", { name: new RegExp(name.replace(/[()]/g, "\\$&")) }).getAttribute("href"))!;
    expect(new URL(href).pathname).toBe("/es/login");
    expect(new URL(href).searchParams.get("next")).toBe("/es/student/resources");
  }
  expect(await page.content()).not.toContain("wordreference.com");

  const download = await request.get(`/api/resource-file/${E2E.worksheet}`, { maxRedirects: 0 });
  expect(download.status()).toBe(302);
  expect(download.headers()["cache-control"]).toBe("no-store");
  const location = download.headers().location!;
  expect(location.startsWith(`${SUPABASE_URL()}/storage/v1/object/sign/resource-files/${FILE_PATH}?token=`)).toBe(true);
  const file = await fetch(location);
  expect(file.status).toBe(200);
  expect(new TextDecoder().decode(await file.arrayBuffer()).startsWith("%PDF-")).toBe(true);

  // Lo restringido y lo inexistente: 404, sin distinguir.
  for (const id of ["c0000000-0000-4000-8000-000000000003", "c0000000-0000-4000-8000-0000000000aa", "abc"]) {
    expect((await request.get(`/api/resource-file/${id}`, { maxRedirects: 0 })).status(), id).toBe(404);
  }

  // Al pasar a "solo alumnos", la web deja de firmarlo aunque su caché siga vigente.
  await update("resources", E2E.worksheet, { access_level: "enrolled" });
  expect((await request.get(`/api/resource-file/${E2E.worksheet}`, { maxRedirects: 0 })).status()).toBe(404);
});

test("revalidate rejects a missing or wrong secret", async ({ request }) => {
  expect((await request.post("/api/revalidate")).status()).toBe(401);
  expect((await request.post("/api/revalidate", { headers: { Authorization: "Bearer nope" } })).status()).toBe(401);
});

test("GET /api/health reports db ok and indexing off, without configuration", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({ status: "ok", app: "web", commit: null, indexing: false, db: "ok" });
});

test("a demo environment is out of search engines: every response carries X-Robots-Tag and robots.txt disallows all", async ({ request }) => {
  for (const path of ["/es", "/es/resources", `/es/learn/${SEED.lessons.public}`, "/api/health", "/sitemap.xml"]) {
    expect((await request.get(path)).headers()["x-robots-tag"], path).toBe("noindex, nofollow");
  }
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \//);
  expect(robots).not.toMatch(/Sitemap:/i);
});
