import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * axe (WCAG 2.2 AA) sobre el estado final de la página: sin bloques a medio
 * aparecer ni animaciones de entrada en curso. Las animaciones infinitas (el
 * vaivén de las burbujas del hero) no terminan nunca: no se esperan.
 */
export async function expectNoAxeViolations(page: Page) {
  // Con la página ya hidratada (RevealOnScroll marca los bloques al montar), se
  // muestran todos y se espera a que terminen las transiciones de entrada.
  await page.waitForLoadState("networkidle");
  // Los carruseles de la home avanzan solos; con el puntero encima se detienen
  // (si no, un cambio de diapositiva a mitad del análisis falsea el contraste).
  const vp = page.viewportSize();
  if (vp) await page.mouse.move(vp.width / 2, Math.min(300, vp.height / 2));
  await page.evaluate(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    document.querySelectorAll(".reveal-pending").forEach((el) => el.classList.remove("reveal-pending"));
    const finite = document.getAnimations().filter((a) => a.effect?.getComputedTiming().endTime !== Infinity);
    await Promise.all(finite.map((a) => a.finished.catch(() => undefined)));
  });
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

/** Ancho de página que sobra respecto al viewport (0 = sin scroll horizontal). */
export function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
