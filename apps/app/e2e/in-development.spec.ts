import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, expectPath, login, USERS } from "./fixtures";

const MAIN_NAV = "Navegación principal";

// Con todos los módulos hechos, ninguna área del portal tiene módulos "en desarrollo" (lib/nav.ts).
const AREAS = [
  { who: "admin", home: "/es/admin", dev: 0, total: 18 },
  { who: "teacher", home: "/es/teacher", dev: 0, total: 7 },
  { who: "student", home: "/es/student", dev: 0, total: 10 },
  { who: "guardian", home: "/es/guardian", dev: 0, total: 5 },
] as const;

for (const { who, home, dev, total } of AREAS) {
  test(`${who} menu lists every module and none is marked as in development`, async ({ page }) => {
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

test("a module of another role redirects like any other route of that role", async ({ page }) => {
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
  for (const path of ["/es/admin/unknown", "/es/admin/dashboard"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});

test("every guardian page has no accessibility violations (es/en, desktop and mobile)", async ({ page }) => {
  await login(page, USERS.guardian);
  await expectPath(page, "/es/guardian");
  for (const path of ["children", "schedule", "payments", "consents", "resources"]) {
    for (const locale of ["es", "en"]) {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/${locale}/guardian/${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoAxeViolations(page);
      if (locale === "es") {
        await page.setViewportSize({ width: 375, height: 812 });
        await expectNoAxeViolations(page);
      }
    }
  }
});
