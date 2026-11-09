import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { expectPath, login, USERS, signOut } from "./fixtures";

const MAIN_NAV = "Navegación principal";

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

test("teacher+student switches area from the topbar", async ({ page }) => {
  await login(page, USERS.teacher);
  await expectPath(page, "/es/teacher");
  const switcher = page.getByRole("group", { name: "Cambiar de área" });
  await expect(switcher.getByRole("link")).toHaveText(["Docente", "Alumno"]);
  await expect(switcher.getByRole("link", { name: "Docente" })).toHaveAttribute("aria-current", "true");

  await switcher.getByRole("link", { name: "Alumno" }).click();
  await expectPath(page, "/es/student");
  await expect(page.getByRole("navigation", { name: MAIN_NAV }).getByRole("link", { name: "Inicio" }))
    .toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("group", { name: "Cambiar de área" }).getByRole("link", { name: "Alumno" }),
  ).toHaveAttribute("aria-current", "true");
});

test("a single-role student has no area switcher and no admin links", async ({ page }) => {
  await login(page, USERS.student);
  await expectPath(page, "/es/student");
  await expect(page.getByRole("group", { name: "Cambiar de área" })).toHaveCount(0);
  await expect(page.locator('a[href*="/admin"]')).toHaveCount(0);
});

test("locale switch keeps the current path", async ({ page }) => {
  await login(page, USERS.admin);
  await expectPath(page, "/es/admin");
  await page.getByRole("group", { name: "Idioma" }).getByRole("link", { name: /EN/ }).click();
  await expectPath(page, "/en/admin");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Administration");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("menu opens with the button, closes with Escape and returns focus", async ({ page }) => {
    await login(page, USERS.student);
    await expectPath(page, "/es/student");
    // En móvil la barra lateral de escritorio está oculta.
    await expect(page.getByRole("navigation", { name: MAIN_NAV })).toBeHidden();

    const button = page.getByRole("button", { name: "Menú" });
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const nav = page.getByRole("navigation", { name: MAIN_NAV });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Inicio" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(nav).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("logout is reachable from the menu", async ({ page }) => {
    await login(page, USERS.student);
    await expectPath(page, "/es/student");
    await page.getByRole("button", { name: "Menú" }).click();
    await signOut(page);
    await expectPath(page, "/es/login");
  });
});

for (const [who, home] of [
  ["admin", "/es/admin"],
  ["teacher", "/es/teacher"],
  ["student", "/es/student"],
] as const) {
  test(`${who} home has no automated accessibility violations (desktop and mobile)`, async ({
    page,
  }) => {
    await login(page, USERS[who]);
    await expectPath(page, home);
    await expectNoAxeViolations(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Menú" }).click();
    await expectNoAxeViolations(page);
  });
}
