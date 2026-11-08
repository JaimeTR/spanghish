import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations, horizontalOverflow } from "./helpers";

/** Rellena el formulario de /es/bookings con una solicitud válida. */
async function fillValid(page: Page) {
  await page.getByLabel("Tu nombre").fill("Ana López");
  await page.getByLabel("Email").fill("ana@example.com");
  await page.getByRole("radio", { name: "Niños (6–13)" }).check();
  await page.getByRole("radio", { name: "Online" }).check();
  await page.getByLabel("¿Qué días y horas te vienen bien?").fill("Sábados por la mañana");
  await page.getByRole("radio", { name: "Español" }).check();
  await page.getByRole("checkbox", { name: /Acepto que Spanglish use estos datos/ }).check();
}

test.describe("booking form", () => {
  test("an empty submit shows the error summary with focus and marks each field", async ({ page }) => {
    await page.goto("/es/bookings");
    await page.getByRole("button", { name: "Enviar solicitud" }).click();

    const summary = page.locator('[aria-labelledby="error-summary-title"]');
    await expect(summary).toBeFocused();
    await expect(summary.getByRole("heading")).toHaveText("Revisa 7 campos:");
    await expect(summary.getByRole("link", { name: "Escribe tu nombre." })).toHaveAttribute("href", "#f-name");

    const name = page.getByLabel("Tu nombre");
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toHaveAttribute("aria-describedby", /f-name-error/);
    await expect(page.locator("#f-name-error")).toHaveText("Escribe tu nombre.");
    await expect(page.getByLabel("Email")).toHaveAttribute("autocomplete", "email");
    await expect(page.getByLabel("Teléfono (opcional)")).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#f-consent-error")).toBeVisible();
    await expect(page).toHaveURL(/\/es\/bookings$/);

    // Corregir un campo y reenviar actualiza el resumen.
    await name.fill("Ana");
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(summary.getByRole("heading")).toHaveText("Revisa 6 campos:");
    await expect(name).not.toHaveAttribute("aria-invalid", "true");
  });

  test("an invalid email gets its own message", async ({ page }) => {
    await page.goto("/en/bookings");
    await page.getByLabel("Email").fill("ana@");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.locator("#f-email-error")).toHaveText("Enter a valid email, like name@example.com.");
  });

  test("a valid request (dev delivery) lands on thank-you with no personal data in the URL", async ({ page }) => {
    await page.goto("/es/bookings");
    await fillValid(page);
    await page.waitForTimeout(3300); // tiempo mínimo antispam
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(page).toHaveURL(/\/es\/thank-you$/, { timeout: 20_000 });
    expect(page.url()).not.toMatch(/[?#]|ana|example/i);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("¡Gracias!");
    await expect(page.getByText("lo antes posible").first()).toBeVisible();
  });

  test("a filled honeypot is rejected and the fallback contact details are shown", async ({ page }) => {
    await page.goto("/es/bookings");
    await fillValid(page);
    await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => {
      el.value = "http://spam.example";
    });
    await page.waitForTimeout(3300);
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    const alert = page.getByRole("main").getByRole("alert");
    await expect(alert).toContainText("No hemos podido enviar tu solicitud");
    await expect(alert).toBeFocused();
    await expect(alert.getByRole("link", { name: "0413 178 583" })).toHaveAttribute("href", "tel:+61413178583");
    await expect(page).toHaveURL(/\/es\/bookings$/);
  });

  test("a submission faster than a person could type is rejected", async ({ page }) => {
    await page.goto("/es/bookings");
    await fillValid(page);
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("No hemos podido enviar tu solicitud");
    await expect(page).toHaveURL(/\/es\/bookings$/);
  });

  test("the consent text links to the privacy policy and the honeypot is hidden", async ({ page }) => {
    await page.goto("/en/bookings");
    await expect(page.getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/en/privacy-policy");
    await expect(page.locator('input[name="website"]')).toHaveAttribute("tabindex", "-1");
    await expect(page.getByRole("textbox", { name: "Leave this field empty" })).toHaveCount(0);
  });

  test("every free-lesson CTA points at /bookings", async ({ page }) => {
    for (const path of ["/es", "/es/lessons", "/es/faq", "/es/prices"]) {
      await page.goto(path);
      const hrefs = await page.getByRole("link", { name: /clase gratis/i }).evaluateAll((els) => els.map((e) => e.getAttribute("href")));
      expect(hrefs.length, path).toBeGreaterThan(0);
      for (const href of hrefs.filter((h) => !h?.startsWith("#"))) expect(href, path).toBe("/es/bookings");
    }
  });
});

test.describe("faq and prices", () => {
  test("the FAQ JSON-LD lists exactly the questions on the page", async ({ page }) => {
    await page.goto("/en/faq");
    const questions = await page.locator('main section[id^="faq-"] h3').allTextContents();
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((s) => JSON.parse(s));
    const faq = ld.find((d) => d["@type"] === "FAQPage");
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(questions);
    expect(questions.length).toBeGreaterThan(15);
    await expect(page.getByRole("navigation", { name: "Topics" }).getByRole("link")).toHaveCount(6);
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/[{}]/);
    expect(text).toContain("$245");
  });

  test("prices come from one source on home and on /prices", async ({ page }) => {
    await page.goto("/es/prices");
    const text = await page.locator("main").innerText();
    for (const amount of ["$30", "$40", "$390", "$45", "$245", "$25", "$310", "$205", "$35"]) expect(text).toContain(amount);
    expect(text).not.toMatch(/[{}]|GST|IVA/);
    await page.goto("/es");
    const home = await page.locator("#prices").innerText();
    for (const amount of ["$30", "$40", "$390", "$45", "$245"]) expect(home).toContain(amount);
    await page.locator("#prices").getByRole("link", { name: "Ver todos los precios y formatos" }).click();
    await expect(page).toHaveURL(/\/es\/prices$/);
  });
});

test.describe("header fit", () => {
  for (const width of [1024, 1152, 1280]) {
    test(`the header nav fits on one line at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/es/faq");
      const items = page.getByRole("navigation", { name: "Navegación principal" }).getByRole("listitem");
      await expect(items).toHaveCount(5);
      const tops = await items.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
      expect(new Set(tops).size).toBe(1);
      const cta = await page.locator("header").getByRole("link", { name: "Clase gratis" }).boundingBox();
      expect(cta && cta.x + cta.width).toBeLessThanOrEqual(width);
      expect(await horizontalOverflow(page)).toBe(0);
    });
  }
});

test.describe("not found", () => {
  test("an unknown path under a locale returns the branded page with HTTP 404", async ({ page, request }) => {
    const res = await request.get("/es/nope");
    expect(res.status()).toBe(404);
    expect(await res.text()).toContain("Esta página no existe");

    await page.goto("/en/nope/deeper");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Oops! This page doesn’t exist");
    await expect(page).toHaveTitle("Page not found · Spanglish");
    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: "Book a free lesson" })).toHaveAttribute("href", "/en/bookings");
    await expect(main.getByRole("link", { name: "See the lessons" })).toHaveAttribute("href", "/en/lessons");
    await expect(main.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/en");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("an unknown path without a locale ends on the Spanish 404", async ({ request }) => {
    const res = await request.get("/zzz", { headers: { "accept-language": "" } });
    expect(res.status()).toBe(404);
    expect(res.url()).toMatch(/\/es\/zzz$/);
    expect(await res.text()).toContain("Esta página no existe");
  });

  for (const locale of ["es", "en"]) {
    for (const width of [375, 1280]) {
      test(`axe: the ${locale} 404 has no violations at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${locale}/nope`);
        await expectNoAxeViolations(page);
        expect(await horizontalOverflow(page)).toBe(0);
      });
    }
  }
});
