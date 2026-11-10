import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, expectPath, login, USERS } from "./fixtures";

test.describe("shell: menú lateral y menú de cuenta", () => {
  test("the admin sidebar groups modules under titled sections", async ({ page }) => {
    await login(page, USERS.admin);
    await expectPath(page, "/es/admin");
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    for (const group of ["Operación", "Personas", "Contenido", "Gestión"]) {
      await expect(nav.getByRole("listitem").filter({ hasText: group }).first()).toBeVisible();
    }
  });

  test("the sidebar collapses to icons, keeps accessible names and remembers the choice", async ({ page }) => {
    await login(page, USERS.admin);
    await expectPath(page, "/es/admin");
    const aside = page.locator("aside[data-collapsed]");
    await expect(aside).toHaveAttribute("data-collapsed", "false");
    await page.getByRole("button", { name: "Minimizar menú" }).click();
    await expect(aside).toHaveAttribute("data-collapsed", "true");
    await expect(page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Alumnos" })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.reload();
    await expect(aside).toHaveAttribute("data-collapsed", "true");
    await page.getByRole("button", { name: "Expandir menú" }).click();
    await expect(aside).toHaveAttribute("data-collapsed", "false");
  });

  test("the sidebar has an icon-only minimize button beside the logo, no visible scrollbar and ends with Cerrar sesión", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 520 });
    await login(page, USERS.admin);
    await expectPath(page, "/es/admin");
    const aside = page.locator("aside[data-collapsed]");
    const toggle = aside.getByRole("button", { name: "Minimizar menú" });
    expect(await toggle.innerText()).toBe("");
    const [logoBox, toggleBox] = await Promise.all([aside.getByRole("link", { name: "Spanglish, inicio" }).boundingBox(), toggle.boundingBox()]);
    expect(Math.abs(logoBox!.y + logoBox!.height / 2 - (toggleBox!.y + toggleBox!.height / 2))).toBeLessThan(30);
    expect(toggleBox!.x).toBeGreaterThan(logoBox!.x + logoBox!.width);

    // La navegación se desplaza (la ventana es baja) pero sin barra visible.
    const scroller = aside.locator("div.overflow-y-auto");
    const widthGap = () => scroller.evaluate((el) => (el as HTMLElement).offsetWidth - el.clientWidth);
    expect(await scroller.evaluate((el) => getComputedStyle(el).scrollbarWidth)).toBe("none");
    expect(await scroller.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    expect(await widthGap()).toBe(0);

    // Al final: solo "Cerrar sesión", y funciona.
    const signOut = aside.getByRole("button", { name: "Cerrar sesión" });
    await expect(signOut).toBeVisible();
    await expect(aside.getByText("Minimizar menú")).toHaveCount(0);
    await signOut.click();
    await expectPath(page, "/es/login");
  });

  test("the account button in the corner shows the name and the role", async ({ page }) => {
    await login(page, USERS.admin);
    await expectPath(page, "/es/admin");
    const trigger = page.getByTestId("user-menu-trigger");
    await expect(trigger).toContainText("Admin Local");
    await expect(trigger).toContainText("Administrador");
  });

  test("the account menu opens My account and Settings and closes with Escape", async ({ page }) => {
    await login(page, USERS.admin);
    await expectPath(page, "/es/admin");
    const trigger = page.getByRole("button", { name: /Admin Local/ });
    await trigger.click();
    await expect(page.getByRole("link", { name: "Configuración" })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await page.getByRole("link", { name: "Mi cuenta" }).click();
    await expectPath(page, "/es/account");
    await expect(page.getByRole("heading", { name: "Mi cuenta" })).toBeVisible();
    await expect(page.getByText("admin@spanglish.test")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("settings page offers the language switch and has no axe violations", async ({ page }) => {
    await login(page, USERS.student);
    await expectPath(page, "/es/student");
    await page.goto("/es/account/settings");
    await expect(page.getByRole("heading", { name: "Configuración" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("the account pages need a session", async ({ page }) => {
    await page.goto("/es/account");
    await expectPath(page, "/es/login");
  });

  test("the mobile menu lists the groups, account links and sign out", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, USERS.admin);
    await expectPath(page, "/es/admin");
    await page.getByRole("button", { name: "Menú" }).click();
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(nav.getByText("Personas")).toBeVisible();
    await expect(page.getByRole("link", { name: "Mi cuenta" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  });
});
