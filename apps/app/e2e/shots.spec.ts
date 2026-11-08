import path from "node:path";
import { test } from "@playwright/test";
import { expectPath, login, USERS } from "./fixtures";

/**
 * Capturas para revisión visual del shell. Solo con SHOTS_DIR definido, p. ej.:
 *   SHOTS_DIR=../../.superpowers/shots pnpm e2e shots
 * (el directorio de destino no se versiona).
 */
const dir = process.env.SHOTS_DIR;
test.skip(!dir, "SHOTS_DIR no definido");

const widths = [375, 1280] as const;

for (const who of ["admin", "teacher", "student"] as const) {
  test(`shots: ${who}`, async ({ page }) => {
    await login(page, USERS[who]);
    await expectPath(page, `/es/${who}`);
    for (const width of widths) {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 800 });
      await page.screenshot({ path: path.resolve(dir!, `${who}-${width}.png`), fullPage: true });
      if (width === 375) {
        await page.getByRole("button", { name: "Menú" }).click();
        await page.screenshot({ path: path.resolve(dir!, `${who}-${width}-menu.png`), fullPage: true });
        await page.keyboard.press("Escape");
      }
    }
  });
}
