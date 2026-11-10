import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { adminClient, expectNoAxeViolations, expectPath, login, USERS } from "./fixtures";

const db = adminClient();
const created: { id: string; path: string }[] = [];
const labels = { public: "e2e-recursos-libre", account: "e2e-recursos-cuenta", enrolled: "e2e-recursos-alumno" };

test.beforeEach(async () => {
  for (const [tier, slug] of Object.entries(labels)) {
    const id = randomUUID(); const external = tier === "enrolled" ? "https://secret.example.test/locked" : "https://example.test/open";
    const { error } = await db.from("resources").insert({ id, kind: "link", access_level: tier as "public" | "account" | "enrolled", status: "published", sort_order: 9000, title_es: slug, title_en: slug, description_es: "e2e-resumen", description_en: "e2e-summary", external_url: external });
    if (error) throw error; created.push({ id, path: "" });
  }
});

test.afterEach(async () => {
  for (const item of created.splice(0)) {
    if (item.path) await db.storage.from("resource-files").remove([item.path]);
    await db.from("resources").delete().eq("id", item.id);
  }
});

test("visitor sees public and account resources, while enrolled teaser has no resource link or source", async ({ page }) => {
  await login(page, USERS.visitor); await expectPath(page, "/es/student"); await page.goto("/es/student/resources");
  await expect(page.getByText("Tu acceso: Con cuenta")).toBeVisible();
  await expect(page.getByRole("heading", { name: labels.public })).toBeVisible();
  await expect(page.getByRole("heading", { name: labels.account })).toBeVisible();
  const locked = page.locator("article").filter({ has: page.getByRole("heading", { name: labels.enrolled }) });
  await expect(locked.getByText("Disponible para alumnos matriculados")).toBeVisible();
  if (process.env.NEXT_PUBLIC_WEB_URL) { await expect(locked.locator("a")).toHaveCount(1); await expect(locked.locator("a")).toHaveAttribute("href", /bookings$/); }
  else await expect(locked.locator("a")).toHaveCount(0);
  const html = await locked.innerHTML(); expect(html).not.toContain("secret.example.test");
  await page.setViewportSize({ width: 375, height: 812 }); await expectNoAxeViolations(page);
  await page.setViewportSize({ width: 1280, height: 900 }); await expectNoAxeViolations(page);
});

test("student unlocks enrolled resources", async ({ page }) => {
  await login(page, USERS.student); await expectPath(page, "/es/student"); await page.goto("/es/student/resources");
  await expect(page.getByText("Tu acceso: Alumno")).toBeVisible(); await expect(page.getByRole("heading", { name: labels.enrolled })).toBeVisible();
});

test("visitor requesting the enrolled file route gets 404", async ({ page }) => {
  await login(page, USERS.visitor); await expectPath(page, "/es/student");
  const id = created.at(-1)?.id; expect(id).toBeTruthy();
  const response = await page.goto(`/es/student/resources/${id}/open`);
  expect(response?.status()).toBe(404);
});

test("student file open redirects with 303 to signed storage URL", async ({ page }) => {
  const id = randomUUID(); const path = `resources/${id}/${randomUUID()}.pdf`;
  const { error: uploadError } = await db.storage.from("resource-files").upload(path, Buffer.from("%PDF-1.4\n% e2e\n%%EOF"), { contentType: "application/pdf" });
  if (uploadError) throw uploadError;
  const { error } = await db.from("resources").insert({ id, kind: "document", access_level: "enrolled", status: "published", sort_order: 9000, title_es: "e2e-pdf", title_en: "e2e-pdf", file_path: path, file_mime: "application/pdf", file_size_bytes: 19 });
  if (error) { await db.storage.from("resource-files").remove([path]); throw error; }
  created.push({ id, path });
  await login(page, USERS.student); await expectPath(page, "/es/student");
  // Sin seguir la redirección: el destino es una descarga, no una página.
  const response = await page.request.get(`/es/student/resources/${id}/open`, { maxRedirects: 0 });
  expect(response.status()).toBe(303); expect(response.headers()["cache-control"]).toContain("private, no-store"); expect(response.headers().location).toContain("token=");
});

test("anonymous open redirects to login and malformed ids return 404", async ({ page }) => {
  await login(page, USERS.visitor); await expectPath(page, "/es/student");
  const response = await page.goto("/es/student/resources/nope/open");
  expect(response?.status()).toBe(404);
  await page.context().clearCookies();
  await page.goto("/es/student/resources/00000000-0000-4000-8000-000000000099/open");
  await expectPath(page, "/es/login?next=%2Fes%2Fstudent%2Fresources%2F00000000-0000-4000-8000-000000000099%2Fopen");
});
