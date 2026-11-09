import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, expectPath, login, USERS } from "./fixtures";

const MAIN_NAV = "Navegación principal";

// Módulos "en desarrollo" de cada área (lib/nav.ts).
const AREAS = [
  { who: "admin", home: "/es/admin", dev: 6, total: 13 },
  { who: "teacher", home: "/es/teacher", dev: 6, total: 6 },
  { who: "student", home: "/es/student", dev: 8, total: 9 },
  { who: "guardian", home: "/es/guardian", dev: 5, total: 5 },
] as const;

for (const { who, home, dev, total } of AREAS) {
  test(`${who} menu lists every module and marks the ones in development`, async ({ page }) => {
    await login(page, USERS[who]);
    await expectPath(page, home);
    const nav = page.getByRole("navigation", { name: MAIN_NAV });
    await expect(nav.getByRole("link")).toHaveCount(total);
    await expect(nav.getByRole("link", { name: /,\s*en desarrollo$/i })).toHaveCount(dev);
    await expect(nav.getByText("En desarrollo")).toHaveCount(dev);
    // La portada enseña las tarjetas de los módulos con su estado.
    const modules = page.getByRole("region", { name: "Módulos" });
    await expect(modules.getByRole("link", { name: /,\s*en desarrollo$/i })).toHaveCount(dev);
  });
}

test("a module in development explains what it will do, with a sample view and no data requests", async ({
  page,
}) => {
  await login(page, USERS.admin);
  await expectPath(page, "/es/admin");
  await expect(page.getByText("Datos de ejemplo")).toBeVisible();

  const dataRequests: string[] = [];
  page.on("request", (r) => {
    if (/\/rest\/v1\/|\/storage\/v1\//.test(r.url())) dataRequests.push(r.url());
  });

  const calendarLink = page
    .getByRole("navigation", { name: MAIN_NAV })
    .getByRole("link", { name: /^Calendario\s*,\s*En desarrollo$/ });
  await calendarLink.click();
  await expectPath(page, "/es/admin/calendar");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toHaveText("Calendario");
  await expect(main.getByText("En desarrollo", { exact: true })).toBeVisible();
  const bullets = main.getByRole("region", { name: "Qué podrás hacer aquí" }).getByRole("listitem");
  expect(await bullets.count()).toBeGreaterThanOrEqual(3);
  expect(await bullets.count()).toBeLessThanOrEqual(5);
  await expect(main.getByText("Vista de ejemplo (no son datos reales)")).toBeVisible();
  await expect(calendarLink).toHaveAttribute("aria-current", "page");

  await page.reload();
  await expect(main.getByRole("heading", { level: 1 })).toHaveText("Calendario");
  expect(dataRequests).toEqual([]);

  await main.getByRole("link", { name: "Volver al inicio" }).click();
  await expectPath(page, "/es/admin");
});

test("a module in development of another role redirects like any other route of that role", async ({ page }) => {
  await login(page, USERS.student);
  await expectPath(page, "/es/student");
  await page.goto("/es/admin/calendar");
  await expectPath(page, "/es/student");
  await page.goto("/es/teacher/today");
  await expectPath(page, "/es/student");
  await page.goto("/es/guardian/children");
  await expectPath(page, "/es/student");
});

test("an unknown module key is a 404, also for a ready module's key", async ({ page }) => {
  await login(page, USERS.admin);
  await expectPath(page, "/es/admin");
  for (const path of ["/es/admin/unknown", "/es/admin/settings", "/es/admin/dashboard"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});

test("a module in development has no accessibility violations (es/en, desktop and mobile)", async ({ page }) => {
  await login(page, USERS.teacher);
  await expectPath(page, "/es/teacher");
  for (const path of ["/es/teacher/attendance", "/en/teacher/attendance"]) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: path.startsWith("/en") ? "Menu" : "Menú" }).click();
    await expectNoAxeViolations(page);
  }
});
