import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers";

const PROFILES = [
  { slug: "maribel-mayhua", name: "Maribel Mayhua" },
  { slug: "pamela-rojas", name: "Pamela Rojas" },
] as const;

test.describe("teachers", () => {
  test("the index lists both teachers and links to each profile", async ({ page }) => {
    await page.goto("/es/teachers");
    await expect(page.getByRole("heading", { level: 1, name: "Conócenos" })).toBeVisible();
    for (const { slug, name } of PROFILES) {
      const link = page.getByRole("link", { name });
      await expect(link).toHaveAttribute("href", `/es/teachers/${slug}`);
    }
    await page.getByRole("link", { name: "Pamela Rojas" }).click();
    await expect(page).toHaveURL(/\/es\/teachers\/pamela-rojas$/);
    await expect(page.getByRole("heading", { level: 1, name: "Pamela Rojas" })).toBeVisible();
  });

  test("Pamela's profile shows her real data in Spanish and English", async ({ page }) => {
    await page.goto("/es/teachers/pamela-rojas");
    await expect(page).toHaveTitle(/^Pamela Rojas, profesora de español/);
    await expect(page.getByText("psicóloga y viajera incansable").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reserva conmigo" })).toBeVisible();
    await page.goto("/en/teachers/pamela-rojas");
    await expect(page).toHaveTitle(/^Pamela Rojas, Spanish tutor/);
    await expect(page.getByRole("heading", { name: "Enrol with me" })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/teachers\/pamela-rojas$/);
  });

  test("Maribel's profile keeps her lesson approach and audiences", async ({ page }) => {
    await page.goto("/es/teachers/maribel-mayhua");
    await expect(page.getByText("Certificada para enseñar los niveles A1, A2, B1 y B2")).toBeVisible();
    await expect(page.getByRole("heading", { name: "¿Cómo son sus clases?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "¿A quién da clase?" })).toBeVisible();
  });

  test("an unknown teacher returns 404", async ({ page }) => {
    const response = await page.goto("/es/teachers/nobody");
    expect(response?.status()).toBe(404);
  });

  test("old WordPress profile URLs redirect to the new profiles", async ({ request }) => {
    for (const [from, to] of [
      ["/mediplus-doctor/pamela", "/teachers/pamela-rojas"],
      ["/mediplus-doctor/maribel-mayhua", "/teachers/maribel-mayhua"],
    ] as const) {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status()).toBe(308);
      expect(response.headers().location).toContain(to);
    }
  });

  test("the sitemap lists both profiles", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toContain("/es/teachers/pamela-rojas");
    expect(xml).toContain("/en/teachers/maribel-mayhua");
  });

  for (const width of [375, 1280]) {
    for (const path of ["/es/teachers", "/en/teachers", "/es/teachers/pamela-rojas", "/en/teachers/maribel-mayhua"]) {
      test(`axe: ${path} has no violations at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await expectNoAxeViolations(page);
      });
    }
  }
});
