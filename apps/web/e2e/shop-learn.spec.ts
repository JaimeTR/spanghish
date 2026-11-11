import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations, horizontalOverflow } from "./helpers";

/**
 * Tienda (carrito y pago) y Aprende ahora (lecciones). La e2e corre sin
 * STRIPE_SECRET_KEY: "Pagar ahora" debe decir que los pagos no están activos,
 * sin redirigir a ningún sitio.
 */

const cartButton = (page: Page, count: number, locale: "es" | "en" = "es") =>
  page
    .locator("header")
    .getByRole("button", { name: locale === "es" ? `Carrito, ${count} ${count === 1 ? "artículo" : "artículos"}` : `Cart, ${count} ${count === 1 ? "item" : "items"}` });

const product = (page: Page, name: string) => page.locator("article").filter({ has: page.getByRole("heading", { name, exact: true }) });

async function addToCart(page: Page, name: string) {
  const card = product(page, name);
  await card.getByRole("button", { name: "Añadir al carrito" }).click();
  await expect(card.getByRole("button", { name: /En el carrito/ })).toBeVisible();
}

test.describe("shop and cart", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("lists only the three real products with sale and published prices", async ({ page }) => {
    await page.goto("/es/shop");
    const cards = page.locator("#products article");
    await expect(cards).toHaveCount(3);
    await expect(cards.getByRole("heading", { level: 3 })).toHaveText(["El Abecedario – The Alphabet", "Spanish Regular Verbs Basic", "Regular Verbs in Spanish"]);
    const text = await page.locator("#products").innerText();
    for (const price of ["$5.00", "$2.00", "$4.99", "$1.99"]) expect(text).toContain(price);
    expect(text).not.toMatch(/Product Name|9-Week|PDF/i);
    await expect(page.locator("#products").getByText("¡Oferta!")).toHaveCount(3);
    await expect(product(page, "Regular Verbs in Spanish").getByText("Antes $4.99, ahora $1.99")).toBeAttached();
    await expect(page.getByText(/30 % de descuento en los recursos digitales/)).toBeVisible();
    await expect(page.locator('main a[href="/es/resources"]').first()).toBeVisible();
    await expect(page.locator('main a[href="/es/learn"]').first()).toBeVisible();
  });

  test("add and remove update the badge; the cart survives a reload", async ({ page }) => {
    await page.goto("/es/shop");
    // Vacío: no hay botón de carrito en la cabecera; aparece al añadir algo.
    await expect(page.locator("header").getByRole("button", { name: /^Carrito/ })).toHaveCount(0);
    await addToCart(page, "Regular Verbs in Spanish");
    await expect(cartButton(page, 1)).toBeVisible();
    await addToCart(page, "El Abecedario – The Alphabet");
    await expect(cartButton(page, 2)).toBeVisible();
    await expect(page.locator("header .cart-badge")).toHaveText("2");

    await page.reload();
    await expect(cartButton(page, 2)).toBeVisible();
    await expect(product(page, "Regular Verbs in Spanish").getByRole("button", { name: /En el carrito/ })).toBeVisible();

    // Persiste también en otra página (la cabecera es común).
    await page.goto("/es/faq");
    await cartButton(page, 2).click();
    const dialog = page.getByRole("dialog", { name: "Tu carrito" });
    await dialog.getByRole("button", { name: "Quitar Regular Verbs in Spanish del carrito" }).click();
    await expect(dialog.getByRole("list", { name: "Productos en tu carrito" }).getByRole("listitem")).toHaveCount(1);
    await expect(cartButton(page, 1)).toBeAttached();
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(cartButton(page, 1)).toBeVisible();
  });

  test("the cart dialog: subtotal in AUD, Escape closes and focus returns to the cart button", async ({ page }) => {
    await page.goto("/es/shop");
    await addToCart(page, "Spanish Regular Verbs Basic");
    await addToCart(page, "Regular Verbs in Spanish");
    const button = cartButton(page, 2);
    await button.click();
    const dialog = page.getByRole("dialog", { name: "Tu carrito" });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((d) => (d as HTMLDialogElement).open && d.matches(":modal"))).toBe(true);
    await expect(dialog.getByTestId("cart-subtotal")).toHaveText("$3.99 AUD");
    await expect(dialog).toContainText("Precios en dólares australianos (AUD).");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();

    // "En el carrito" de una tarjeta abre el mismo panel; el botón de cerrar también devuelve el foco.
    await product(page, "Spanish Regular Verbs Basic").getByRole("button", { name: /En el carrito/ }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cerrar el carrito" }).click();
    await expect(dialog).toBeHidden();
  });

  test("removing the last item leaves the panel saying the cart is empty, and the button goes away", async ({ page }) => {
    await page.goto("/en/shop");
    const card = page.locator("article").filter({ has: page.getByRole("heading", { name: "Regular Verbs in Spanish", exact: true }) });
    await card.getByRole("button", { name: "Add to cart" }).click();
    await cartButton(page, 1, "en").click();
    const dialog = page.getByRole("dialog", { name: "Your cart" });
    await dialog.getByRole("button", { name: /^Remove / }).click();
    await expect(dialog).toContainText("Your cart is empty.");
    await dialog.getByRole("link", { name: "Go to the shop" }).click();
    await expect(page).toHaveURL(/\/en\/shop$/);
    await expect(page.locator("header").getByRole("button", { name: /^Cart/ })).toHaveCount(0);
  });

  test("checkout without a Stripe key shows the honest message and does not redirect", async ({ page }) => {
    await page.goto("/es/shop");
    await addToCart(page, "El Abecedario – The Alphabet");
    await cartButton(page, 1).click();
    const dialog = page.getByRole("dialog", { name: "Tu carrito" });
    await dialog.getByRole("button", { name: "Pagar ahora" }).click();
    const alert = dialog.getByRole("alert");
    await expect(alert).toContainText("Los pagos aún no están activos; escríbenos y te lo enviamos.");
    await expect(alert.getByRole("link", { name: "hello@spanglish.com.au" })).toHaveAttribute("href", "mailto:hello@spanglish.com.au");
    await expect(alert.getByRole("link", { name: "0413 178 583" })).toHaveAttribute("href", "tel:+61413178583");
    await expect(page).toHaveURL(/\/es\/shop$/);
    await expect(cartButton(page, 1)).toBeAttached();
  });

  test("the success page without a verified payment does not claim it was received", async ({ page }) => {
    await page.goto("/es/shop");
    await addToCart(page, "El Abecedario – The Alphabet");
    await page.goto("/es/shop/success?session_id=cs_test_notreal1234567");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Gracias por tu compra");
    await expect(page.getByRole("main")).not.toContainText("Pago recibido");
    // Sin confirmación de Stripe el carrito no se vacía.
    await expect(cartButton(page, 1)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  for (const locale of ["es", "en"] as const) {
    for (const width of [375, 1280]) {
      test(`axe: /${locale}/shop with the cart dialog open at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${locale}/shop`);
        await page.locator("#products article").first().getByRole("button", { name: locale === "es" ? "Añadir al carrito" : "Add to cart" }).click();
        await cartButton(page, 1, locale).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expectNoAxeViolations(page);
        expect(await horizontalOverflow(page)).toBe(0);
      });
    }
  }
});

test.describe("navigation: Recursos group", () => {
  test("desktop: Recursos stays a link and its chevron shows the hub, Aprende ahora and the shop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/es/learn/alphabet");
    const nav = page.getByRole("navigation", { name: "Navegación principal" }).filter({ has: page.getByRole("button", { name: "Mostrar recursos" }) });
    const link = nav.getByRole("link", { name: "Recursos", exact: true });
    await expect(link).toHaveAttribute("href", "/es/resources");
    await expect(link).toHaveAttribute("aria-current", "true");
    await nav.getByRole("button", { name: "Mostrar recursos" }).click();
    for (const [name, href] of [
      ["Todos los recursos", "/es/resources"],
      ["Aprende ahora", "/es/learn"],
      ["Tienda de materiales", "/es/shop"],
    ] as const) {
      await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
    }
    await nav.getByRole("link", { name: "Tienda de materiales", exact: true }).click();
    await expect(page).toHaveURL(/\/es\/shop$/);
    await nav.getByRole("button", { name: "Mostrar recursos" }).click();
    await expect(nav.getByRole("link", { name: "Tienda de materiales", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("mobile: Recursos expands with the shop and no cart button while the cart is empty", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/en");
    await page.evaluate(() => window.localStorage.setItem("spanglish.cart.v1", JSON.stringify({ ids: [] })));
    await expect(page.locator("header").getByRole("button", { name: /^Cart/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Menu" }).click();
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await nav.getByRole("button", { name: "Resources" }).click();
    await nav.getByRole("link", { name: "Learn now" }).click();
    await expect(page).toHaveURL(/\/en\/learn$/);
  });

  test("the footer links Aprende ahora and the shop; the home LearnNow block goes to /learn", async ({ page }) => {
    await page.goto("/es");
    const footer = page.getByRole("navigation", { name: "Navegación del pie de página" });
    await expect(footer.getByRole("link", { name: "Aprende ahora" })).toHaveAttribute("href", "/es/learn");
    await expect(footer.getByRole("link", { name: "Tienda de materiales" })).toHaveAttribute("href", "/es/shop");
    await page.locator("#learn").getByRole("link", { name: "Ir a Aprende ahora" }).click();
    await expect(page).toHaveURL(/\/es\/learn$/);
    await expect(page.locator('a[href*="spanglish.com.au/learn-spanish"]')).toHaveCount(0);
  });
});

test.describe("learn now", () => {
  test("the hub mirrors the live menu: two real lessons, the rest coming soon without links", async ({ page }) => {
    await page.goto("/es/learn");
    const lessons = page.locator("#lessons");
    await expect(lessons.getByRole("heading", { level: 3 })).toHaveText(["Fundamentos", "Niños", "Adultos", "Historias", "Juegos"]);
    const links = lessons.getByRole("link");
    await expect(links).toHaveCount(3);
    await expect(lessons.getByRole("link", { name: /El alfabeto/ })).toHaveAttribute("href", "/es/learn/alphabet");
    await expect(lessons.getByRole("link", { name: /^Sustantivos y artículos/ })).toHaveAttribute("href", "/es/learn/nouns-and-articles");
    await expect(lessons.getByRole("link", { name: /Nivel A1: Sustantivos y artículos/ })).toHaveAttribute("href", "/es/learn/nouns-and-articles");
    expect(await lessons.getByText("Próximamente", { exact: true }).count()).toBeGreaterThan(20);
    await expect(page.locator('main a[href="/es/shop"]').first()).toBeVisible();
    await expect(page.locator('main a[href="/es/bookings"]').first()).toBeVisible();
    await expect(page.getByRole("main")).toContainText("portal de alumnos");
  });

  test("a lesson page has breadcrumbs, the English content marked as such, next/prev and the free lesson", async ({ page }) => {
    await page.goto("/es/learn/alphabet");
    await expect(page.getByRole("heading", { level: 1 })).toHaveAttribute("lang", "en");
    const crumbs = page.getByRole("navigation", { name: "Ruta de navegación" });
    await expect(crumbs.getByRole("link", { name: "Aprende ahora" })).toHaveAttribute("href", "/es/learn");
    await expect(page.locator("#lesson > [lang=en]")).toHaveCount(1);
    await expect(page.getByRole("main")).toContainText("Esta lección está en inglés");
    const more = page.getByRole("navigation", { name: "Más lecciones" });
    await more.getByRole("link", { name: /Siguiente lección/ }).click();
    await expect(page).toHaveURL(/\/es\/learn\/nouns-and-articles$/);
    await expect(page.getByRole("navigation", { name: "Más lecciones" }).getByRole("link", { name: /Lección anterior/ })).toHaveAttribute("href", "/es/learn/alphabet");
    await expect(page.getByRole("main").getByRole("link", { name: "Reserva tu clase gratis" }).first()).toHaveAttribute("href", "/es/bookings");
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((s) => JSON.parse(s));
    expect(ld.map((d) => d["@type"])).toEqual(expect.arrayContaining(["BreadcrumbList", "LearningResource"]));
    expect(ld.find((d) => d["@type"] === "LearningResource")).toMatchObject({ isAccessibleForFree: true, inLanguage: "en", educationalLevel: "A1" });
  });

  test("alphabet: picking a letter shows its example word", async ({ page }) => {
    await page.goto("/en/learn/alphabet");
    const n = page.getByRole("button", { name: "Ñ eñe", exact: true });
    await n.click();
    await expect(n).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#alphabet")).toContainText("niño");
    await expect(page.locator("#alphabet")).toContainText("(child)");
    await page.getByRole("button", { name: /Ver resumen en español/ }).click();
    await expect(page.getByText("Resumen en español", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ocultar resumen en español/ })).toHaveAttribute("aria-expanded", "true");
  });

  test("nouns: the exercises score like the live lesson", async ({ page }) => {
    await page.goto("/en/learn/nouns-and-articles");
    const practice = page.locator("#practice");
    // 1: tocar palabra y caja (sin arrastrar).
    const sort = practice.locator("section").filter({ hasText: "Masculine or feminine?" });
    await sort.getByRole("button", { name: /día/ }).click();
    await sort.getByRole("button", { name: /^Masculine · el/ }).click();
    await sort.getByRole("button", { name: "Check answers" }).click();
    await expect(sort).toContainText("1 correct so far — 9 words still to place.");
    await sort.getByRole("button", { name: "Show answers" }).click();
    await sort.getByRole("button", { name: "Check answers" }).click();
    await expect(sort).toContainText("¡Perfecto! 10 / 10");
    await expect(practice).toContainText("10 / 30 points");
    // 2: plurales, sin tildes.
    const plural = practice.locator("section").filter({ hasText: "Make it plural" });
    await plural.getByLabel(/el lápiz/).fill("los lapices");
    await plural.getByLabel(/la flor/).fill("flores");
    await plural.getByRole("button", { name: "Check answers" }).click();
    await expect(plural).toContainText("Almost! Add the article → las flores");
    await expect(plural).toContainText("1 / 8 correct.");
    await expect(practice).toContainText("11 / 30 points");
    // 3: elegir artículo.
    const mcq = practice.locator("section").filter({ hasText: "Pick the right article" });
    await mcq.getByRole("group", { name: "Options for sentence 5" }).getByRole("button", { name: "El" }).click();
    await expect(mcq).toContainText("Agua is feminine");
    await expect(mcq).toContainText("1 correct · 7 to go");
    // 4: la bolsa.
    const bag = practice.locator("section").filter({ hasText: "What’s in your bag?" });
    await bag.getByLabel("Item 1").fill("unos libro");
    await bag.getByRole("button", { name: "Check", exact: true }).click();
    await expect(bag).toContainText("unos is plural — the noun should end in -s.");
    await expect(practice).toContainText("12 / 30 points");
  });

  for (const path of ["/learn", "/learn/alphabet", "/learn/nouns-and-articles"]) {
    test(`no horizontal overflow on ${path} at 360px`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(`/es${path}`);
      expect(await horizontalOverflow(page)).toBe(0);
    });
  }
});

test.describe("old WordPress URLs", () => {
  for (const [from, to] of [
    ["/learn-spanish/", "/es/learn"],
    ["/learn-spanish/spanish-foundations/spanish-alphabet/", "/es/learn/alphabet"],
    ["/learn-spanish/spanish-adults-lessons/level-a1/the-nouns-in-spanish/", "/es/learn/nouns-and-articles"],
    ["/product/alphabet/", "/es/shop"],
  ] as const) {
    test(`${from} ends on ${to}`, async ({ request }) => {
      const res = await request.get(from, { headers: { "accept-language": "" } });
      expect(res.ok()).toBe(true);
      expect(new URL(res.url()).pathname).toBe(to);
    });
  }
});

test("the sitemap lists the shop and the lessons but not the payment confirmation", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const locale of ["es", "en"]) {
    for (const slug of ["learn", "learn/alphabet", "learn/nouns-and-articles", "shop"]) {
      expect(xml).toMatch(new RegExp(`<loc>https?://[^<]+/${locale}/${slug}</loc>`));
    }
    expect(xml).not.toMatch(new RegExp(`/${locale}/shop/success`));
  }
});

test("the Stripe webhook rejects unsigned requests", async ({ request }) => {
  const res = await request.post("/api/stripe/webhook", { data: { type: "checkout.session.completed" } });
  expect(res.status()).toBe(400);
});
