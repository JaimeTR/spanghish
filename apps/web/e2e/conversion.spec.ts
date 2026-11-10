import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations, horizontalOverflow } from "./helpers";

/** Paso 1 de /es/bookings: quién eres y para quién es la clase. */
async function fillStep1(page: Page) {
  await page.getByLabel("Tu nombre").fill("Ana López");
  await page.getByLabel("Email").fill("ana@example.com");
  await page.getByRole("radio", { name: "Niños (6–13)" }).check();
}

/** Paso 2: cómo, cuándo y consentimiento. */
async function fillStep2(page: Page) {
  await page.getByRole("radio", { name: "Online" }).check();
  await page.getByLabel("¿Qué días y horas te vienen bien?").fill("Sábados por la mañana");
  await page.getByRole("radio", { name: "Español" }).check();
  await page.getByRole("checkbox", { name: /Acepto que Spanglish use estos datos/ }).check();
}

/** Rellena los dos pasos de /es/bookings con una solicitud válida. */
async function fillValid(page: Page) {
  await fillStep1(page);
  await page.getByRole("button", { name: "Siguiente" }).click();
  await fillStep2(page);
}

test.describe("booking form (two steps)", () => {
  test("step 1 validates only its own fields, then step 2 opens with focus on its title", async ({ page }) => {
    await page.goto("/es/bookings");
    await expect(page.getByText("Paso 1 de 2")).toBeVisible();
    await expect(page.locator("form").getByRole("heading", { name: "Tu clase", exact: true })).toBeHidden();

    await page.getByRole("button", { name: "Siguiente" }).click();
    const summary = page.locator('[aria-labelledby="error-summary-title"]');
    await expect(summary).toBeFocused();
    await expect(summary.getByRole("heading")).toHaveText("Revisa 3 campos:");
    await expect(summary.getByRole("link", { name: "Escribe tu nombre." })).toHaveAttribute("href", "#f-name");
    const name = page.getByLabel("Tu nombre");
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toHaveAttribute("aria-describedby", /f-name-error/);
    await expect(page.getByLabel("Email")).toHaveAttribute("autocomplete", "email");
    await expect(page.getByLabel("Teléfono (opcional)")).not.toHaveAttribute("aria-invalid", "true");

    await fillStep1(page);
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Paso 2 de 2")).toBeVisible();
    await expect(page.locator("form").getByRole("heading", { name: "Tu clase", exact: true })).toBeFocused();
    await expect(page.getByLabel("Tu nombre")).toBeHidden();
    await expect(page).toHaveURL(/\/es\/bookings$/);
  });

  test("step 2 shows its own errors and Back keeps what was typed", async ({ page }) => {
    await page.goto("/es/bookings");
    await fillStep1(page);
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    const summary = page.locator('[aria-labelledby="error-summary-title"]');
    await expect(summary).toBeFocused();
    await expect(summary.getByRole("heading")).toHaveText("Revisa 4 campos:");
    await expect(page.locator("#f-consent-error")).toBeVisible();

    await page.getByRole("button", { name: "Atrás" }).click();
    await expect(page.getByText("Paso 1 de 2")).toBeVisible();
    await expect(page.getByLabel("Tu nombre")).toHaveValue("Ana López");
    await expect(page.getByRole("radio", { name: "Niños (6–13)" })).toBeChecked();
  });

  test("an invalid email gets its own message", async ({ page }) => {
    await page.goto("/en/bookings");
    await page.getByLabel("Email").fill("ana@");
    await page.getByRole("button", { name: "Next" }).click();
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

  test("the consent text links to the privacy policy and the honeypot is hidden", async ({ page }) => {
    await page.goto("/en/bookings");
    await page.getByLabel("Your name").fill("Ana");
    await page.getByLabel("Email").fill("ana@example.com");
    await page.getByRole("radio", { name: /Kids/ }).check();
    await page.getByRole("button", { name: "Next" }).click();
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
      // Sin nada en el carrito no hay botón; con un artículo aparece y sigue en la misma línea.
      await expect(page.locator("header").getByRole("button", { name: /^Carrito/ })).toHaveCount(0);
      await page.evaluate(() => window.localStorage.setItem("spanglish.cart.v1", JSON.stringify({ ids: ["alphabet"] })));
      await page.reload();
      const items = page.getByRole("navigation", { name: "Navegación principal" }).getByRole("listitem");
      // Clases, Recursos y Contacto (con sus desplegables cerrados), Precios y Conócenos.
      await expect(items).toHaveCount(5);
      const tops = await items.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
      expect(new Set(tops).size).toBe(1);
      const cta = await page.locator("header").getByRole("link", { name: "Clase gratis" }).boundingBox();
      expect(cta && cta.x + cta.width).toBeLessThanOrEqual(width);
      // En páginas sin contenido con cuenta (como Preguntas) la cabecera no enlaza al portal.
      await expect(page.locator("header").getByRole("link", { name: /^Entrar al portal de alumnos$/ })).toHaveCount(0);
      // El carrito, en la misma línea y con su nombre accesible.
      const cartButton = page.locator("header").getByRole("button", { name: "Carrito, 1 artículo" });
      // El botón entra con una animación de escala: se mide cuando ya terminó.
      await cartButton.evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
      const cart = await cartButton.boundingBox();
      expect(cart).not.toBeNull();
      expect(Math.abs(cart!.y + cart!.height / 2 - (cta!.y + cta!.height / 2))).toBeLessThan(4);
      expect(cart!.width).toBeGreaterThanOrEqual(44);
      const resources = page.getByRole("navigation", { name: "Navegación principal" }).getByRole("button", { name: "Mostrar recursos" });
      expect(Math.abs((await resources.boundingBox())!.y - (await items.first().boundingBox())!.y)).toBeLessThan(4);
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

test.describe("contact form", () => {
  test("is on the contact page, separate from the free-lesson form, and validates", async ({ page }) => {
    await page.goto("/es/contact-us");
    const form = page.locator("#message");
    await expect(form.getByRole("link", { name: "Ir al formulario de clase gratis" })).toHaveAttribute("href", "/es/bookings");
    await form.getByRole("button", { name: "Enviar mensaje" }).click();
    const summary = page.locator('[aria-labelledby="contact-error-summary-title"]');
    await expect(summary).toBeFocused();
    await expect(summary.getByRole("heading")).toHaveText("Revisa 4 campos:");
    await expect(page.getByLabel("Tu mensaje")).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/es\/contact-us$/);
  });

  test("a valid message (dev delivery) lands on thank-you with no personal data in the URL", async ({ page }) => {
    await page.goto("/en/contact-us");
    await page.getByLabel("Your name").fill("Sam");
    await page.getByLabel("Your email").fill("sam@example.com");
    await page.getByLabel("Your message").fill("Do you teach teenagers online?");
    await page.getByRole("checkbox", { name: /I agree that Spanglish may use these details/ }).check();
    await page.waitForTimeout(3300);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page).toHaveURL(/\/en\/thank-you$/, { timeout: 20_000 });
    expect(page.url()).not.toMatch(/[?#]|sam|example/i);
  });

  test("a message sent too fast is rejected", async ({ page }) => {
    await page.goto("/es/contact-us");
    await page.getByLabel("Tu nombre").fill("Sam");
    await page.getByLabel("Tu email").fill("sam@example.com");
    await page.getByLabel("Tu mensaje").fill("Hola");
    await page.getByRole("checkbox", { name: /Acepto que Spanglish use estos datos/ }).check();
    await page.getByRole("button", { name: "Enviar mensaje" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("No hemos podido enviar tu mensaje");
  });
});
