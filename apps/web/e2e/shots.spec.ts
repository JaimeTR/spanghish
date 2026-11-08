import path from "node:path";
import { test } from "@playwright/test";

/**
 * Capturas de página completa para revisión de diseño. Solo con DESIGN_SHOTS=1:
 *   DESIGN_SHOTS=1 pnpm --filter @spanglish/web e2e shots
 * Se guardan en apps/web/.design-preview/ (no se versiona).
 */
test.skip(!process.env.DESIGN_SHOTS, "DESIGN_SHOTS no definido");

const dir = path.resolve(__dirname, "../.design-preview");

for (const locale of ["es", "en"] as const) {
  for (const width of [375, 1440] as const) {
    test(`shot ${locale} ${width}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      // Recorre la página para que carguen las imágenes diferidas (logo del pie).
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 40));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
      await page.screenshot({ path: path.join(dir, `home-${locale}-${width}-fold.png`) });
      await page.screenshot({ path: path.join(dir, `home-${locale}-${width}.png`), fullPage: true });
      if (width === 375) {
        await page.getByRole("button", { name: locale === "es" ? "Menú" : "Menu" }).click();
        await page.screenshot({ path: path.join(dir, `home-${locale}-${width}-menu.png`) });
      }
    });
  }
}
