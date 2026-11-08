import path from "node:path";
import { test } from "@playwright/test";

/**
 * Capturas de página completa para revisión de diseño. Solo con DESIGN_SHOTS=1:
 *   DESIGN_SHOTS=1 pnpm --filter @spanglish/web e2e shots
 * Se guardan en apps/web/.design-preview/ (no se versiona).
 * SHOTS_ONLY=teachers,contact-us limita las páginas.
 */
test.skip(!process.env.DESIGN_SHOTS, "DESIGN_SHOTS no definido");

const dir = path.resolve(__dirname, "../.design-preview");
const ALL = [
  "",
  "lessons",
  "adult-lessons",
  "kids-lessons",
  "mature-lessons",
  "online-conversations",
  "resources",
  "teachers",
  "contact-us",
  "bookings",
  "prices",
  "faq",
  "thank-you",
  "privacy-policy",
  "terms",
];
const only = process.env.SHOTS_ONLY?.split(",").map((s) => (s === "home" ? "" : s));
const PAGES = only ? ALL.filter((p) => only.includes(p)) : ALL;

for (const slug of PAGES) {
  const name = slug || "home";
  for (const locale of ["es", "en"] as const) {
    for (const width of [375, 1440] as const) {
      test(`shot ${name} ${locale} ${width}`, async ({ page }) => {
        test.setTimeout(90_000);
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
        await page.goto(slug ? `/${locale}/${slug}` : `/${locale}`);
        await page.evaluate(() => document.fonts.ready);
        // Recorre la página para que carguen las imágenes diferidas (logo del pie).
        await page.evaluate(async () => {
          document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((i) => (i.loading = "eager"));
          for (let y = 0; y < document.body.scrollHeight; y += 600) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 40));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
        await page.screenshot({ path: path.join(dir, `${name}-${locale}-${width}-fold.png`) });
        await page.screenshot({ path: path.join(dir, `${name}-${locale}-${width}.png`), fullPage: true });
        if (width === 375 && !slug) {
          await page.getByRole("button", { name: locale === "es" ? "Menú" : "Menu" }).click();
          await page.screenshot({ path: path.join(dir, `${name}-${locale}-${width}-menu.png`) });
        }
      });
    }
  }
}

/** Navegación: desplegable "Clases" abierto (1280) y menú de móvil con Clases desplegado (375). */
for (const locale of ["es", "en"] as const) {
  test(`shot nav dropdown ${locale} 1280`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/${locale}/kids-lessons`);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: locale === "es" ? "Mostrar clases" : "Show lessons" }).click();
    await page.screenshot({ path: path.join(dir, `nav-dropdown-${locale}-1280.png`) });
  });

  test(`shot mobile menu lessons ${locale} 375`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: locale === "es" ? "Menú" : "Menu" }).click();
    await page.getByRole("navigation", { name: locale === "es" ? "Navegación principal" : "Main navigation" })
      .getByRole("button", { name: locale === "es" ? "Clases" : "Lessons" })
      .click();
    await page.screenshot({ path: path.join(dir, `nav-mobile-lessons-${locale}-375.png`) });
  });
}
