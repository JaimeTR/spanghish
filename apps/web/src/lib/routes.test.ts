import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import {
  activeNavKey,
  showsPortalLogin,
  bookingPath,
  FOOTER_NAV,
  HEADER_NAV,
  isIndexable,
  languageAlternates,
  localePath,
  navRoute,
  ROUTE_KEYS,
  ROUTES,
  type NavChild,
} from "./routes";

const APP_DIR = path.resolve(__dirname, "../app/[locale]");

describe("routes", () => {
  it("keeps the current site's slugs so old links and SEO carry over", () => {
    expect(ROUTES).toEqual({
      home: "",
      lessons: "lessons",
      adults: "adult-lessons",
      kids: "kids-lessons",
      mature: "mature-lessons",
      online: "online-conversations",
      resources: "resources",
      teachers: "teachers",
      contact: "contact-us",
      bookings: "bookings",
      thankYou: "thank-you",
      faq: "faq",
      prices: "prices",
      privacy: "privacy-policy",
      terms: "terms",
      learn: "learn",
      learnAlphabet: "learn/alphabet",
      learnNouns: "learn/nouns-and-articles",
      shop: "shop",
      shopSuccess: "shop/success",
      shopCheckout: "shop/checkout",
      myPurchases: "my-purchases",
    });
  });

  it("every slug is unique, kebab-case (nested segments allowed) and has a page.tsx", () => {
    const slugs = Object.values(ROUTES);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      if (slug) expect(slug).toMatch(/^[a-z]+(?:-[a-z]+)*(?:\/[a-z]+(?:-[a-z]+)*)*$/);
      expect(existsSync(path.join(APP_DIR, slug, "page.tsx")), `page for "${slug}"`).toBe(true);
    }
  });

  it("builds locale paths with an optional anchor", () => {
    expect(localePath("es", "home")).toBe("/es");
    expect(localePath("en", "kids")).toBe("/en/kids-lessons");
    expect(localePath("en", "home", "prices")).toBe("/en#prices");
    expect(bookingPath("es")).toBe("/es/bookings");
    expect(bookingPath("en")).toBe("/en/bookings");
    expect(localePath("en", "learnAlphabet")).toBe("/en/learn/alphabet");
  });

  it("hreflang alternates list both locales plus x-default (Spanish)", () => {
    expect(languageAlternates("teachers")).toEqual({
      es: "/es/teachers",
      en: "/en/teachers",
      "x-default": "/es/teachers",
    });
  });

  it("navigation only points at existing routes and every label exists in both locales", () => {
    const children = HEADER_NAV.flatMap((i): readonly NavChild[] => ("children" in i ? i.children : []));
    const items = [...HEADER_NAV, ...children, ...FOOTER_NAV.lessons, ...FOOTER_NAV.school, ...FOOTER_NAV.legal];
    for (const item of items) {
      expect(ROUTE_KEYS).toContain(item.route);
      expect((es.nav as Record<string, string>)[item.key], `es nav.${item.key}`).toBeTruthy();
      expect((en.nav as Record<string, string>)[item.key], `en nav.${item.key}`).toBeTruthy();
    }
    // La cabecera enlaza solo a páginas, no a secciones (anclas) de la home.
    expect(HEADER_NAV.every((i) => !("hash" in i))).toBe(true);
  });

  it("the header lists the important pages, with the lessons sub-pages under Clases", () => {
    expect(HEADER_NAV.map((i) => i.route)).toEqual(["lessons", "prices", "resources", "teachers", "contact"]);
    const lessons = HEADER_NAV.find((i) => i.key === "lessons");
    expect(lessons && "children" in lessons && lessons.children.map((c) => c.route)).toEqual([
      "lessons",
      "adults",
      "kids",
      "mature",
      "online",
    ]);
  });

  it("Recursos groups the hub, Aprende ahora and the shop", () => {
    const resources = HEADER_NAV.find((i) => i.key === "resources");
    expect(resources && "children" in resources && resources.children.map((c) => c.route)).toEqual(["resources", "learn", "shop"]);
    expect(FOOTER_NAV.school.map((i) => i.route)).toEqual(expect.arrayContaining(["learn", "shop"]));
  });

  it("the footer links the online conversations and the resources", () => {
    expect(FOOTER_NAV.lessons.map((i) => i.route)).toContain("online");
    expect(FOOTER_NAV.school.map((i) => i.route)).toContain("resources");
  });

  it("marks the right header item as current", () => {
    expect(activeNavKey("kids")).toBe("lessons");
    expect(activeNavKey("adults")).toBe("lessons");
    expect(activeNavKey("mature")).toBe("lessons");
    expect(activeNavKey("online")).toBe("lessons");
    expect(activeNavKey("resources")).toBe("resources");
    expect(activeNavKey("learn")).toBe("resources");
    expect(activeNavKey("shop")).toBe("resources");
    expect(activeNavKey("learnAlphabet")).toBe("resources");
    expect(activeNavKey("learnNouns")).toBe("resources");
    expect(activeNavKey("shopSuccess")).toBe("resources");
    expect(navRoute("learnNouns")).toBe("learn");
    expect(navRoute("faq")).toBe("faq");
    expect(activeNavKey("lessons")).toBe("lessons");
    expect(activeNavKey("teachers")).toBe("teachers");
    expect(activeNavKey("contact")).toBe("contact");
    expect(activeNavKey("prices")).toBe("prices");
    expect(activeNavKey("faq")).toBe("contact");
    expect(activeNavKey("home")).toBeUndefined();
    expect(activeNavKey("bookings")).toBeUndefined();
  });

  it("shows the portal sign-in only on the home, resources and learn pages", () => {
    for (const route of ["home", "resources", "learn", "learnAlphabet", "learnNouns"] as const) {
      expect(showsPortalLogin(route), route).toBe(true);
    }
    for (const route of ["prices", "faq", "teachers", "contact", "adults", "shop", "bookings"] as const) {
      expect(showsPortalLogin(route), route).toBe(false);
    }
    expect(showsPortalLogin(undefined)).toBe(false);
  });

  it("keeps the confirmations and the legal drafts out of search engines", () => {
    expect(ROUTE_KEYS.filter((r) => !isIndexable(r))).toEqual(["thankYou", "privacy", "terms", "shopSuccess", "shopCheckout", "myPurchases"]);
    expect(isIndexable("bookings")).toBe(true);
    expect(isIndexable("shop")).toBe(true);
    expect(isIndexable("learnNouns")).toBe(true);
  });

  it("the footer links the legal pages", () => {
    expect(FOOTER_NAV.legal.map((i) => i.route)).toEqual(["privacy", "terms"]);
  });
});
