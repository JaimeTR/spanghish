import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers";

/** Páginas interiores: slug (igual en ambos idiomas), h1 y título por idioma. */
const PAGES = [
  {
    slug: "lessons",
    es: { h1: "Clases de español", title: /^Clases de español para adultos, niños y mayores/ },
    en: { h1: "Spanish lessons", title: /^Spanish lessons for adults, kids and mature learners/ },
  },
  {
    slug: "adult-lessons",
    es: { h1: "Clases de español para adultos", title: /^Clases de español para adultos \(14\+\)/ },
    en: { h1: "Spanish lessons for adults", title: /^Spanish lessons for adults \(14\+\)/ },
  },
  {
    slug: "kids-lessons",
    es: { h1: "Clases de español para niños", title: /^Clases de español para niños \(6 a 13 años\)/ },
    en: { h1: "Spanish lessons for kids", title: /^Spanish lessons for kids \(aged 6 to 13\)/ },
  },
  {
    slug: "mature-lessons",
    es: { h1: "Clases de español para mayores", title: /^Clases de español para mayores \(65\+\)/ },
    en: { h1: "Spanish lessons for mature adults", title: /^Spanish lessons for mature adults \(65\+\)/ },
  },
  {
    slug: "online-conversations",
    es: { h1: "Conversación online", title: /^Conversación online en español \(10 semanas, nivel intermedio\)/ },
    en: { h1: "Online conversations", title: /^Online Spanish conversations \(10 weeks, intermediate\)/ },
  },
  {
    slug: "resources",
    es: { h1: "Recursos para aprender español", title: /^Recursos gratis para aprender español/ },
    en: { h1: "Resources to learn Spanish", title: /^Free resources to learn Spanish/ },
  },
  {
    slug: "teachers",
    es: { h1: "Conócenos", title: /^Conócenos: Maribel Mayhua y Pamela Rojas/ },
    en: { h1: "Meet us", title: /^Meet us: Maribel Mayhua and Pamela Rojas/ },
  },
  {
    slug: "contact-us",
    es: { h1: "Contacto", title: /^Contacto y clase gratis/ },
    en: { h1: "Contact us", title: /^Contact us and book a free lesson/ },
  },
  {
    slug: "bookings",
    es: { h1: "Tu primera clase ¡es gratis!", title: /^Reserva tu clase gratis de español/ },
    en: { h1: "Your first lesson is free!", title: /^Book your free Spanish lesson/ },
  },
  {
    slug: "prices",
    es: { h1: "Precios y formatos", title: /^Precios y formatos de las clases de español/ },
    en: { h1: "Prices and formats", title: /^Spanish lesson prices and formats/ },
  },
  {
    slug: "faq",
    es: { h1: "Preguntas frecuentes", title: /^Preguntas frecuentes sobre las clases/ },
    en: { h1: "Frequently asked questions", title: /^Frequently asked questions about Spanish lessons/ },
  },
  {
    slug: "learn",
    es: { h1: "Aprende ahora", title: /^Aprende ahora: lecciones interactivas gratis/ },
    en: { h1: "Learn now", title: /^Learn now: free interactive Spanish lessons/ },
  },
  {
    slug: "learn/alphabet",
    es: { h1: "The Spanish Alphabet", title: /^El alfabeto español: lección interactiva gratis/ },
    en: { h1: "The Spanish Alphabet", title: /^The Spanish alphabet: free interactive lesson/ },
  },
  {
    slug: "learn/nouns-and-articles",
    es: { h1: "Spanish Nouns & Articles", title: /^Sustantivos y artículos en español/ },
    en: { h1: "Spanish Nouns & Articles", title: /^Spanish nouns and articles: free interactive lesson/ },
  },
  {
    slug: "shop",
    es: { h1: "Tienda de materiales", title: /^Tienda de materiales para aprender español/ },
    en: { h1: "Materials shop", title: /^Shop: materials to learn Spanish/ },
  },
  {
    slug: "shop/success",
    noindex: true,
    es: { h1: "Gracias por tu compra", title: /^Pago de tu pedido/ },
    en: { h1: "Thanks for your purchase", title: /^Your order payment/ },
  },
  {
    slug: "thank-you",
    noindex: true,
    es: { h1: "¡Gracias!", title: /^Gracias por tu solicitud/ },
    en: { h1: "Thank you!", title: /^Thank you for your request/ },
  },
  {
    slug: "privacy-policy",
    noindex: true,
    es: { h1: "Política de privacidad", title: /^Política de privacidad/ },
    en: { h1: "Privacy policy", title: /^Privacy policy/ },
  },
  {
    slug: "terms",
    noindex: true,
    es: { h1: "Términos y cancelaciones", title: /^Términos y cancelaciones/ },
    en: { h1: "Terms and cancellations", title: /^Terms and cancellations/ },
  },
] as const;

const LOCALES = ["es", "en"] as const;

for (const p of PAGES) {
  for (const locale of LOCALES) {
    const path = `/${locale}/${p.slug}`;

    test(`${path} renders with its h1, title, canonical and hreflang`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(p[locale].h1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page).toHaveTitle(p[locale].title);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
      for (const l of LOCALES) {
        await expect(page.locator(`link[rel="alternate"][hreflang="${l}"]`)).toHaveAttribute(
          "href",
          new RegExp(`/${l}/${p.slug}$`),
        );
      }
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", p[locale].title);
      const robots = page.locator('meta[name="robots"]');
      if ("noindex" in p) await expect(robots).toHaveAttribute("content", /noindex/);
      else await expect(robots).toHaveCount(0);
      for (const script of await page.locator('script[type="application/ld+json"]').allTextContents()) {
        expect(() => JSON.parse(script)).not.toThrow();
      }
    });

    for (const width of [375, 1280]) {
      test(`axe: ${path} has no violations at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await expectNoAxeViolations(page);
      });
    }
  }
}

test("header and footer links reach every inner page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/es");
  const header = page.getByRole("navigation", { name: "Navegación principal" });

  await header.getByRole("link", { name: "Clases", exact: true }).click();
  await expect(page).toHaveURL(/\/es\/lessons$/);
  await expect(header.getByRole("link", { name: "Clases", exact: true })).toHaveAttribute("aria-current", "page");

  await header.getByRole("link", { name: "Conócenos" }).click();
  await expect(page).toHaveURL(/\/es\/teachers$/);

  await header.getByRole("link", { name: "Contacto" }).click();
  await expect(page).toHaveURL(/\/es\/contact-us$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contacto");

  const footer = page.getByRole("navigation", { name: "Navegación del pie de página" });
  for (const [name, slug] of [
    ["Clases para adultos", "adult-lessons"],
    ["Clases para niños", "kids-lessons"],
    ["Clases para mayores", "mature-lessons"],
    ["Conversación online", "online-conversations"],
    ["Recursos", "resources"],
  ] as const) {
    await footer.getByRole("link", { name }).click();
    await expect(page).toHaveURL(new RegExp(`/es/${slug}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  await header.getByRole("link", { name: "Precios" }).click();
  await expect(page).toHaveURL(/\/es\/prices$/);
  await expect(header.getByRole("link", { name: "Precios" })).toHaveAttribute("aria-current", "page");

  await header.getByRole("link", { name: "Preguntas" }).click();
  await expect(page).toHaveURL(/\/es\/faq$/);
  await expect(header.getByRole("link", { name: "Preguntas" })).toHaveAttribute("aria-current", "page");

  // La cabecera solo enlaza a páginas: no hay accesos directos a secciones de la home.
  await expect(header.getByRole("link", { name: "Cómo son" })).toHaveCount(0);

  // Pie: precios, preguntas y los textos legales.
  const legal = page.getByRole("navigation", { name: "Legal" });
  await legal.getByRole("link", { name: "Privacidad" }).click();
  await expect(page).toHaveURL(/\/es\/privacy-policy$/);
  await legal.getByRole("link", { name: "Términos y cancelaciones" }).click();
  await expect(page).toHaveURL(/\/es\/terms$/);
  await footer.getByRole("link", { name: "Preguntas" }).click();
  await expect(page).toHaveURL(/\/es\/faq$/);
  await footer.getByRole("link", { name: "Precios" }).click();
  await expect(page).toHaveURL(/\/es\/prices$/);
});

test("home audience blocks link to their pages", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("link", { name: "Kids (6–13)" }).click();
  await expect(page).toHaveURL(/\/en\/kids-lessons$/);
});

test("the free-lesson CTA on an inner page goes to the booking form", async ({ page }) => {
  await page.goto("/en/mature-lessons");
  await page.getByRole("main").getByRole("link", { name: "Book your free lesson" }).first().click();
  await expect(page).toHaveURL(/\/en\/bookings$/);
  await expect(page.locator("main form")).toHaveCount(1);
  await expect(page.locator('main a[href="tel:+61413178583"]')).toBeVisible();
});

test("contact has its own short form and links to the free-lesson booking form", async ({ page }) => {
  await page.goto("/es/contact-us");
  await expect(page.locator("main form")).toHaveCount(1);
  await expect(page.locator('main a[href="mailto:hello@spanglish.com.au"]').first()).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Ir al formulario", exact: true }).click();
  await expect(page).toHaveURL(/\/es\/bookings$/);
});

test("language switch keeps the inner path", async ({ page }) => {
  await page.goto("/es/kids-lessons");
  await page.getByRole("group", { name: "Idioma" }).first().getByRole("link", { name: /EN/ }).click();
  await expect(page).toHaveURL(/\/en\/kids-lessons$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Spanish lessons for kids");
  await page.getByRole("group", { name: "Language" }).first().getByRole("link", { name: /ES/ }).click();
  await expect(page).toHaveURL(/\/es\/kids-lessons$/);
});

test.describe("mobile menu on inner pages", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("reaches the teachers page and marks it current", async ({ page }) => {
    await page.goto("/en/contact-us");
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Meet us" }).click();
    await expect(page).toHaveURL(/\/en\/teachers$/);
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Meet us" }),
    ).toHaveAttribute("aria-current", "page");
  });
});

for (const width of [360, 1440]) {
  test(`inner pages have no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const p of PAGES) {
      for (const locale of LOCALES) {
        await page.goto(`/${locale}/${p.slug}`);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${locale}/${p.slug} at ${width}px`).toBe(0);
      }
    }
  });
}

test.describe("old URLs without a locale", () => {
  for (const p of PAGES) {
    test(`/${p.slug} redirects to the default locale (/es)`, async ({ request }) => {
      const res = await request.get(`/${p.slug}`, { maxRedirects: 0, headers: { "accept-language": "" } });
      expect([307, 308]).toContain(res.status());
      expect(res.headers()["location"]).toMatch(new RegExp(`^(https?://[^/]+)?/es/${p.slug}$`));
    });
  }

  test("an English browser lands on /en (next-intl detection)", async ({ request }) => {
    const res = await request.get("/adult-lessons", { maxRedirects: 0, headers: { "accept-language": "en-AU,en;q=0.9" } });
    expect(res.headers()["location"]).toMatch(/\/en\/adult-lessons$/);
  });

  test("the old trailing-slash form ends on the localized page", async ({ request }) => {
    const res = await request.get("/kids-lessons/", { headers: { "accept-language": "" } });
    expect(res.ok()).toBe(true);
    expect(res.url()).toMatch(/\/es\/kids-lessons$/);
  });
});

test("sitemap lists every indexable route in both locales and robots points at it", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const locale of LOCALES) {
    expect(xml).toMatch(new RegExp(`<loc>https?://[^<]+/${locale}</loc>`));
    for (const p of PAGES) {
      const entry = new RegExp(`<loc>https?://[^<]+/${locale}/${p.slug}</loc>`);
      // Confirmación y textos legales (noindex) quedan fuera.
      if ("noindex" in p) expect(xml, p.slug).not.toMatch(entry);
      else expect(xml, p.slug).toMatch(entry);
    }
  }
  expect(xml).toMatch(/hreflang="en" href="https?:\/\/[^"]+\/en\/bookings"/);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
});

test("navigating from a scrolled page lands at the top of the new page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [label, url] of [["Clases", /\/es\/lessons$/], ["Precios", /\/es\/prices$/], ["Conócenos", /\/es\/teachers$/]] as const) {
    await page.goto("/es");
    await page.evaluate(() => window.scrollTo({ top: 3000, behavior: "instant" }));
    await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 5000 }).toBe(0);
  }
});
