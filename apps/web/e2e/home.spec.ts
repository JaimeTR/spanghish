import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoAxeViolations(page: Page) {
  // Mide el estado final: sin bloques a medio aparecer ni animaciones en curso.
  await page.evaluate(async () => {
    document.querySelectorAll(".reveal-pending").forEach((el) => el.classList.remove("reveal-pending"));
    await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
  });
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

const LOCALES = [
  { locale: "es", h1: "¡Habla español con confianza!", cta: "Reserva tu clase gratis", menu: "Menú" },
  { locale: "en", h1: "Speak Spanish with confidence!", cta: "Book your free lesson", menu: "Menu" },
] as const;

for (const { locale, h1, cta } of LOCALES) {
  test(`home renders in ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
    await expect(page.getByRole("link", { name: cta })).toHaveAttribute("href", `/${locale}/contact-us`);
    await expect(page.locator('a[href="tel:+61413178583"]').first()).toBeVisible();
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(JSON.parse(jsonLd ?? "{}").name).toBe("Spanglish");
  });

  for (const width of [375, 1280]) {
    test(`axe: no violations in ${locale} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}`);
      await expectNoAxeViolations(page);
    });
  }
}

test.describe("root redirect", () => {
  test.use({ locale: "es-AU" });
  test("sends a Spanish-speaking browser to /es", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/es$/);
  });
});

test("the root sends an English browser to /en (next-intl detection)", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
});

test("language switch keeps the path", async ({ page }) => {
  await page.goto("/es");
  await page.getByRole("group", { name: "Idioma" }).first().getByRole("link", { name: /EN/ }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("group", { name: "Language" }).first().getByRole("link", { name: /ES/ }).click();
  await expect(page).toHaveURL(/\/es$/);
});

test("skip link is the first tab stop and moves focus to main", async ({ page }) => {
  await page.goto("/es");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Saltar al contenido" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  await expect(page.locator("main")).toBeFocused();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("menu opens, closes with Escape and returns focus", async ({ page }) => {
    await page.goto("/es");
    const button = page.getByRole("button", { name: "Menú" });
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(nav.getByRole("link", { name: "Clases" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toBeFocused();
    await expect(nav).toBeHidden();
  });

  test("choosing a menu link closes the menu", async ({ page }) => {
    await page.goto("/en");
    const button = page.getByRole("button", { name: "Menu" });
    await button.click();
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Prices" }).click();
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(/#prices$/);
  });
});

for (const width of [360, 1440]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const locale of ["es", "en"]) {
      await page.goto(`/${locale}`);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${locale} at ${width}px`).toBe(0);
    }
  });
}

test.describe("hero slider", () => {
  test("shows one slide at a time and moves with the dots", async ({ page }) => {
    await page.goto("/es");
    const region = page.getByRole("group", { name: "Destacados" });
    await expect(region.getByText("¡Habla español", { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    // Solo puntos: sin flechas ni botón de pausa.
    await expect(page.getByRole("button", { name: /siguiente|anterior|Pausar/i })).toHaveCount(0);

    await page.getByRole("button", { name: "Ir a la diapositiva 2 de 3" }).click();
    await expect(region.getByText("¡Español para")).toBeVisible();
    await expect(region.getByRole("link", { name: "Ver clases para niños" })).toHaveAttribute("href", "/es/kids-lessons");

    await page.getByRole("button", { name: "Ir a la diapositiva 3 de 3" }).click();
    await expect(region.getByText("Nunca es tarde")).toBeVisible();
    await expect(region.getByRole("link", { name: "Ver clases para mayores" })).toHaveAttribute("href", "/es/mature-lessons");

    await page.getByRole("button", { name: "Ir a la diapositiva 1 de 3" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("¡Habla español con confianza!");
  });

  test("hidden slides are not reachable", async ({ page }) => {
    await page.goto("/en");
    const links = page.getByRole("group", { name: "Highlights" }).getByRole("link", { name: /See kids lessons/ });
    await expect(links).toHaveCount(0); // inert: fuera del árbol de accesibilidad
  });

  test("advances by itself", async ({ page }) => {
    await page.goto("/es");
    await page.mouse.move(0, 0);
    await expect(page.getByRole("group", { name: "Destacados" }).getByText("¡Español para")).toBeVisible({ timeout: 12_000 });
  });

  test("stops advancing while the pointer rests on the hero", async ({ page }) => {
    await page.goto("/es");
    await page.getByRole("heading", { level: 1 }).hover();
    await page.waitForTimeout(9000);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("group", { name: "Destacados" }).getByText("¡Español para")).toBeHidden();
  });
});

test.describe("hero slider with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("does not rotate by itself", async ({ page }) => {
    await page.goto("/es");
    await page.waitForTimeout(8000);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
