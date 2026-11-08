import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import {
  activeNavKey,
  bookingPath,
  FOOTER_NAV,
  HEADER_NAV,
  languageAlternates,
  localePath,
  ROUTE_KEYS,
  ROUTES,
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
      teachers: "teachers",
      contact: "contact-us",
    });
  });

  it("every slug is unique, kebab-case and has a page.tsx", () => {
    const slugs = Object.values(ROUTES);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      if (slug) expect(slug).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
      expect(existsSync(path.join(APP_DIR, slug, "page.tsx")), `page for "${slug}"`).toBe(true);
    }
  });

  it("builds locale paths with an optional anchor", () => {
    expect(localePath("es", "home")).toBe("/es");
    expect(localePath("en", "kids")).toBe("/en/kids-lessons");
    expect(localePath("en", "home", "prices")).toBe("/en#prices");
    expect(bookingPath("es")).toBe("/es/contact-us");
  });

  it("hreflang alternates list both locales plus x-default (Spanish)", () => {
    expect(languageAlternates("teachers")).toEqual({
      es: "/es/teachers",
      en: "/en/teachers",
      "x-default": "/es/teachers",
    });
  });

  it("navigation only points at existing routes and every label exists in both locales", () => {
    const items = [...HEADER_NAV, ...FOOTER_NAV.lessons, ...FOOTER_NAV.school];
    for (const item of items) {
      expect(ROUTE_KEYS).toContain(item.route);
      expect(es.nav[item.key], `es nav.${item.key}`).toBeTruthy();
      expect(en.nav[item.key], `en nav.${item.key}`).toBeTruthy();
    }
    // Las anclas de la home deben existir como secciones (ids estables).
    const anchors = HEADER_NAV.flatMap((i) => ("hash" in i ? [i.hash] : []));
    expect(anchors).toEqual(["how", "prices"]);
  });

  it("marks the right header item as current", () => {
    expect(activeNavKey("kids")).toBe("lessons");
    expect(activeNavKey("lessons")).toBe("lessons");
    expect(activeNavKey("teachers")).toBe("teachers");
    expect(activeNavKey("contact")).toBe("contact");
    expect(activeNavKey("home")).toBeUndefined();
  });
});
