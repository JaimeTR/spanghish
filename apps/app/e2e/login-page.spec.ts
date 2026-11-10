import { expect, test, type Page } from "@playwright/test";
import { DEV_PASSWORD, expectNoAxeViolations, expectPath, USERS } from "./fixtures";

async function fillCredentials(page: Page) {
  await page.getByLabel("Correo electrónico").fill(USERS.admin);
  await page.getByLabel("Contraseña").fill(DEV_PASSWORD);
}

test.describe("login: opciones del formulario", () => {
  test("the password can be shown and hidden", async ({ page }) => {
    await page.goto("/es/login");
    const password = page.getByLabel("Contraseña");
    await password.fill("secreta-123");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Mostrar" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue("secreta-123");
    await page.getByRole("button", { name: "Ocultar" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("offers forgot-password, keep-me-signed-in (on by default) and the no-account note", async ({ page }) => {
    await page.goto("/es/login");
    await expect(page.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute("href", "/es/forgot-password");
    await expect(page.getByLabel("Mantener la sesión iniciada")).toBeChecked();
    await expect(page.getByText("La crea la escuela")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Iniciar sesión");
  });

  test("the language switch keeps the login page", async ({ page }) => {
    await page.goto("/es/login");
    await page.getByRole("link", { name: /^EN/ }).click();
    await expectPath(page, "/en/login");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
    await expect(page.getByLabel("Keep me signed in")).toBeChecked();
    await expect(page.getByRole("button", { name: "Show" })).toBeVisible();
  });

  test("keeping the session writes persistent cookies; unchecking it writes session cookies", async ({ page, context }) => {
    const sessionCookies = async () => (await context.cookies()).filter((cookie) => cookie.name.startsWith("sb-"));

    await page.goto("/es/login");
    await fillCredentials(page);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expectPath(page, "/es/admin");
    const kept = await sessionCookies();
    expect(kept.length).toBeGreaterThan(0);
    for (const cookie of kept) expect(cookie.expires, cookie.name).toBeGreaterThan(Date.now() / 1000);

    await context.clearCookies();
    await page.goto("/es/login");
    await fillCredentials(page);
    await page.getByLabel("Mantener la sesión iniciada").uncheck();
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expectPath(page, "/es/admin");
    const session = await sessionCookies();
    expect(session.length).toBeGreaterThan(0);
    for (const cookie of session) expect(cookie.expires, cookie.name).toBe(-1);
    expect((await context.cookies()).find((cookie) => cookie.name === "sp_session_only")?.expires).toBe(-1);

    // Las renovaciones de la sesión no la vuelven persistente.
    await page.goto("/es/admin/students");
    await page.reload();
    for (const cookie of (await sessionCookies())) expect(cookie.expires, cookie.name).toBe(-1);
  });
});

test.describe("login: accesibilidad y adaptación", () => {
  for (const path of ["/es/login", "/en/login", "/es/forgot-password"]) {
    for (const width of [375, 1280]) {
      test(`${path} has no axe violations at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 375 ? 812 : 800 });
        await page.goto(path);
        await expectNoAxeViolations(page);
      });
    }
  }

  test("no horizontal scroll at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/es/login");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
});
