import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

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
    slug: "teachers",
    es: { h1: "Conócenos", title: /^Conócenos: Maribel Mayhua/ },
    en: { h1: "Meet us", title: /^Meet us: Maribel Mayhua/ },
  },
  {
    slug: "contact-us",
    es: { h1: "Contacto", title: /^Contacto y clase gratis/ },
    en: { h1: "Contact us", title: /^Contact us and book a free lesson/ },
  },
] as const;

const LOCALES = ["es", "en"] as const;

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

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

  await header.getByRole("link", { name: "Clases" }).click();
  await expect(page).toHaveURL(/\/es\/lessons$/);
  await expect(header.getByRole("link", { name: "Clases" })).toHaveAttribute("aria-current", "page");

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
  ] as const) {
    await footer.getByRole("link", { name }).click();
    await expect(page).toHaveURL(new RegExp(`/es/${slug}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  // Desde una página interior, las anclas de la home siguen funcionando.
  await header.getByRole("link", { name: "Precios" }).click();
  await expect(page).toHaveURL(/\/es#prices$/);
});

test("home audience blocks link to their pages", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("link", { name: "Kids (6–13)" }).click();
  await expect(page).toHaveURL(/\/en\/kids-lessons$/);
});

test("the free-lesson CTA on an inner page goes to contact", async ({ page }) => {
  await page.goto("/en/mature-lessons");
  await page.getByRole("main").getByRole("link", { name: "Book your free lesson" }).first().click();
  await expect(page).toHaveURL(/\/en\/contact-us$/);
  await expect(page.locator('main a[href="tel:+61413178583"]')).toBeVisible();
  await expect(page.locator('main a[href="mailto:hello@spanglish.com.au"]')).toBeVisible();
  await expect(page.locator("main form")).toHaveCount(0);
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

test("sitemap lists every route in both locales and robots points at it", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const locale of LOCALES) {
    expect(xml).toMatch(new RegExp(`<loc>https?://[^<]+/${locale}</loc>`));
    for (const p of PAGES) expect(xml).toMatch(new RegExp(`<loc>https?://[^<]+/${locale}/${p.slug}</loc>`));
  }
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
});
