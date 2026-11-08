import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers";

/** Navegación con subpáginas, portal de alumnos y páginas nuevas (Recursos, Conversación online). */

const L = {
  es: { nav: "Navegación principal", lessons: "Clases", toggle: "Mostrar clases", menu: "Menú", login: "Entrar al portal de alumnos" },
  en: { nav: "Main navigation", lessons: "Lessons", toggle: "Show lessons", menu: "Menu", login: "Sign in to the student portal" },
} as const;

const desktopNav = (page: Page, locale: "es" | "en" = "es") =>
  page.locator("header nav").filter({ has: page.getByRole("button", { name: L[locale].toggle }) });

test.describe("lessons dropdown (desktop)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("opens on hover with a short delay and closes when the pointer leaves", async ({ page }) => {
    await page.goto("/es/faq");
    const nav = desktopNav(page);
    const button = nav.getByRole("button", { name: "Mostrar clases" });
    const panel = page.locator(`#${await button.getAttribute("aria-controls")}`);
    await expect(panel).toBeHidden();

    await nav.getByRole("link", { name: "Clases", exact: true }).hover();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(panel.getByRole("link", { name: /Niños/ })).toBeVisible();

    await page.mouse.move(640, 600);
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();
  });

  test("the chevron toggles on click, an outside click closes, and Clases stays a link", async ({ page }) => {
    await page.goto("/es/faq");
    const nav = desktopNav(page);
    await expect(nav.getByRole("link", { name: "Clases", exact: true })).toHaveAttribute("href", "/es/lessons");
    const button = nav.getByRole("button", { name: "Mostrar clases" });
    await expect(button).toHaveAttribute("aria-controls", /.+/);
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.mouse.click(640, 600);
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });

  test("keyboard: Enter and Space open, Escape closes and returns focus, leaving the group closes", async ({ page }) => {
    await page.goto("/es/faq");
    const nav = desktopNav(page);
    const button = nav.getByRole("button", { name: "Mostrar clases" });
    const panel = page.locator(`#${await button.getAttribute("aria-controls")}`);

    await nav.getByRole("link", { name: "Clases", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(button).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Tab");
    await expect(panel.getByRole("link", { name: "Todas las clases" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toBeFocused();

    await page.keyboard.press("Space");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Space");
    await expect(button).toHaveAttribute("aria-expanded", "false");

    // Recorrer el panel con Tab hasta salir de él lo cierra.
    await page.keyboard.press("Enter");
    const links = panel.getByRole("link");
    const count = await links.count();
    expect(count).toBe(5);
    for (let i = 0; i < count; i++) await page.keyboard.press("Tab");
    await expect(links.last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();
    await expect(nav.getByRole("link", { name: "Precios" })).toBeFocused();
  });

  test("a sub-page marks Clases as current and its own item as the page", async ({ page }) => {
    for (const [slug, item] of [
      ["kids-lessons", "Niños (6–13)"],
      ["online-conversations", "Conversación online"],
    ] as const) {
      await page.goto(`/es/${slug}`);
      const nav = desktopNav(page);
      await expect(nav.getByRole("link", { name: "Clases", exact: true })).toHaveAttribute("aria-current", "true");
      await nav.getByRole("button", { name: "Mostrar clases" }).click();
      await expect(nav.getByRole("link", { name: item, exact: true })).toHaveAttribute("aria-current", "page");
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    }
    await page.goto("/es/lessons");
    await expect(desktopNav(page).getByRole("link", { name: "Clases", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("the sub-items reach their pages", async ({ page }) => {
    await page.goto("/en/faq");
    const nav = desktopNav(page, "en");
    await nav.getByRole("button", { name: "Show lessons" }).click();
    await nav.getByRole("link", { name: "Online conversations" }).click();
    await expect(page).toHaveURL(/\/en\/online-conversations$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Online conversations");
  });

  for (const locale of ["es", "en"] as const) {
    test(`axe: no violations with the dropdown open (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}/adult-lessons`);
      const button = desktopNav(page, locale).getByRole("button", { name: L[locale].toggle });
      await button.click();
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await expectNoAxeViolations(page);
      await expect(button).toHaveAttribute("aria-expanded", "true");
    });
  }
});

test.describe("mobile menu: lessons group", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("Clases expands into indented sub-links and reaches the online page", async ({ page }) => {
    await page.goto("/es");
    await page.getByRole("button", { name: "Menú" }).click();
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    const group = nav.getByRole("button", { name: "Clases" });
    await expect(group).toHaveAttribute("aria-expanded", "false");
    await expect(nav.getByRole("link", { name: "Conversación online" })).toBeHidden();
    await page.keyboard.press("Enter");
    await expect(group).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Tab");
    await expect(nav.getByRole("link", { name: "Todas las clases" })).toBeFocused();
    await nav.getByRole("link", { name: "Conversación online" }).click();
    await expect(page).toHaveURL(/\/es\/online-conversations$/);
  });

  test("on a sub-page the group starts open with the page marked", async ({ page }) => {
    await page.goto("/en/mature-lessons");
    await page.getByRole("button", { name: "Menu" }).click();
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav.getByRole("button", { name: "Lessons" })).toHaveAttribute("aria-expanded", "true");
    await expect(nav.getByRole("link", { name: "Mature adults (65+)" })).toHaveAttribute("aria-current", "page");
  });

  for (const locale of ["es", "en"] as const) {
    test(`axe: no violations with the menu and the group open (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await page.getByRole("button", { name: L[locale].menu }).click();
      await page.getByRole("navigation", { name: L[locale].nav }).getByRole("button", { name: L[locale].lessons }).click();
      await expectNoAxeViolations(page);
    });
  }
});

test.describe("student portal sign-in", () => {
  for (const locale of ["es", "en"] as const) {
    test(`the header links to the ${locale} portal login`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`/${locale}/prices`);
      const login = page.locator("header").getByRole("link", { name: L[locale].login });
      await expect(login).toHaveCount(1);
      await expect(login).toHaveAttribute("href", new RegExp(`^https://[^/]+/${locale}/login$`));
      await expect(login).not.toHaveAttribute("target", /.+/);
    });

    test(`the mobile menu links to the ${locale} portal login`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`/${locale}`);
      await page.getByRole("button", { name: L[locale].menu }).click();
      const login = page.locator("header").getByRole("link", { name: L[locale].login });
      await expect(login).toBeVisible();
      await expect(login).toHaveAttribute("href", new RegExp(`^https://[^/]+/${locale}/login$`));
    });
  }

  test("below 1180px the sign-in link is icon-only but keeps its name; above, it shows text", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/es/faq");
    const login = page.locator("header").getByRole("link", { name: L.es.login });
    expect((await login.boundingBox())!.width).toBeLessThan(50);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(login).toContainText("Entrar");
    expect((await login.boundingBox())!.width).toBeGreaterThan(70);
  });
});

test.describe("resources page", () => {
  test("open, coming-soon and locked cards; no login or sign-up form", async ({ page }) => {
    await page.goto("/es/resources");
    const access = page.locator("#access");
    await expect(access.getByRole("heading", { level: 3 })).toHaveText(["Libre", "Con cuenta", "Solo alumnos"]);

    // Bloqueadas: enlaces reales al login del portal.
    for (const name of ["Grabaciones de clase", "Tareas y material del curso"]) {
      const link = access.getByRole("link", { name: new RegExp(`^${name}\\s?: Entra para verlo$`) });
      await expect(link).toHaveAttribute("href", /^https:\/\/[^/]+\/es\/login$/);
    }
    // Próximamente: informativas, sin enlace.
    for (const name of ["Lecciones interactivas A1–C2", "Fichas descargables", "Vocabulario"]) {
      await expect(access.getByRole("heading", { name, exact: true })).toBeVisible();
      await expect(access.getByRole("link", { name: new RegExp(name) })).toHaveCount(0);
    }
    await expect(access.getByText("Próximamente").first()).toBeVisible();
    await expect(access.getByRole("link", { name: "Reserva tu clase gratis" })).toHaveAttribute("href", "/es/bookings");

    await expect(page.locator("main form, main input[type=password]")).toHaveCount(0);
  });

  test("the video cards jump to the videos, which load YouTube only after pressing play", async ({ page }) => {
    await page.goto("/en/resources");
    const videos = page.locator("#videos");
    await expect(videos.locator("iframe")).toHaveCount(0);
    await page.locator("#access").getByRole("link", { name: "Personal Pronouns in Spanish" }).click();
    await expect(page).toHaveURL(/#video-GilfeIjZm_g$/);
    await videos.getByRole("link", { name: /Play video: Personal Pronouns in Spanish/ }).click();
    await expect(videos.locator("iframe")).toHaveAttribute("src", /youtube-nocookie\.com\/embed\/GilfeIjZm_g/);
  });

  test("the interactive lessons go to Aprende ahora and the materials preview to the shop", async ({ page }) => {
    await page.goto("/es/resources");
    await expect(page.locator('main a[href*="spanglish.com.au/learn-spanish"]')).toHaveCount(0);
    await expect(page.locator('main a[href="/es/learn"]')).toHaveCount(2);
    const materials = page.locator('section[aria-labelledby="materials-title"]');
    await expect(materials.getByRole("heading", { level: 2 })).toHaveText("Materiales descargables");
    await expect(materials.locator('a[href^="/es/shop"]')).toHaveCount(4);
    await materials.getByRole("link", { name: /Spanish Regular Verbs Basic/ }).click();
    await expect(page).toHaveURL(/\/es\/shop#product-spanish-regular-verbs-basic$/);
  });
});

test.describe("online conversations page", () => {
  test("shows only published facts and leads to the free lesson", async ({ page }) => {
    await page.goto("/es/online-conversations");
    const program = page.locator("#program");
    for (const text of ["Intermedio", "10 semanas, una clase por semana", "50 minutos", "$245", "$25"]) {
      await expect(program).toContainText(text);
    }
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((s) => JSON.parse(s));
    const course = ld.find((d) => d["@type"] === "Course");
    expect(course.offers.map((o: { price: number }) => o.price)).toEqual([245, 25]);
    await page.getByRole("main").getByRole("link", { name: "Reserva tu clase gratis" }).first().click();
    await expect(page).toHaveURL(/\/es\/bookings$/);
  });

  test("the home online block links to it", async ({ page }) => {
    await page.goto("/en");
    await page.locator("#lessons").getByRole("link", { name: "Online conversations" }).click();
    await expect(page).toHaveURL(/\/en\/online-conversations$/);
  });
});
