import { describe, expect, it } from "vitest";
import { pageMetadata, SITEMAP_ROUTES, sitemapEntries } from "./seo";
import { TEACHERS } from "./teachers";

describe("pageMetadata", () => {
  it("sets canonical, hreflang and a complete Open Graph block", () => {
    const meta = pageMetadata({ locale: "en", route: "adults", title: "T", description: "D", ogAlt: "A" });
    expect(meta.alternates?.canonical).toBe("/en/adult-lessons");
    expect(meta.alternates?.languages).toEqual({
      es: "/es/adult-lessons",
      en: "/en/adult-lessons",
      "x-default": "/es/adult-lessons",
    });
    expect(meta.openGraph).toMatchObject({ url: "/en/adult-lessons", locale: "en_AU", title: "T", description: "D" });
    expect(meta.openGraph?.images).toEqual([{ url: "/og-spanglish.png", width: 1200, height: 630, alt: "A" }]);
    expect(meta.robots).toBeUndefined();
  });

  it("a subpath page gets its own canonical and hreflang pair", () => {
    const meta = pageMetadata({ locale: "en", route: "teachers", subpath: "pamela-rojas", title: "T", description: "D", ogAlt: "A" });
    expect(meta.alternates?.canonical).toBe("/en/teachers/pamela-rojas");
    expect(meta.alternates?.languages).toEqual({
      es: "/es/teachers/pamela-rojas",
      en: "/en/teachers/pamela-rojas",
      "x-default": "/es/teachers/pamela-rojas",
    });
    expect(meta.openGraph).toMatchObject({ url: "/en/teachers/pamela-rojas" });
  });

  it("marks noindex pages without dropping follow", () => {
    const meta = pageMetadata({ locale: "es", route: "terms", title: "T", description: "D", ogAlt: "A", noindex: true });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe("sitemapEntries", () => {
  it("includes each teacher profile in both locales", () => {
    const urls = sitemapEntries("https://example.test").map((e) => e.url);
    for (const slug of ["maribel-mayhua", "pamela-rojas"]) {
      expect(urls).toContain(`https://example.test/es/teachers/${slug}`);
      expect(urls).toContain(`https://example.test/en/teachers/${slug}`);
    }
  });

  it("lists every indexable route in both locales with absolute URLs and alternates", () => {
    const entries = sitemapEntries("https://example.test");
    expect(entries).toHaveLength((SITEMAP_ROUTES.length + TEACHERS.length) * 2);
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://example.test/es");
    expect(urls).toContain("https://example.test/en/mature-lessons");
    expect(urls).toContain("https://example.test/es/contact-us");
    for (const slug of ["bookings", "faq", "prices"]) {
      expect(urls).toContain(`https://example.test/es/${slug}`);
      expect(urls).toContain(`https://example.test/en/${slug}`);
    }
    for (const slug of ["learn", "learn/alphabet", "learn/nouns-and-articles", "shop"]) {
      expect(urls).toContain(`https://example.test/es/${slug}`);
      expect(urls).toContain(`https://example.test/en/${slug}`);
    }
    for (const slug of ["thank-you", "privacy-policy", "terms", "shop/success"]) {
      expect(urls.some((u) => u.endsWith(`/${slug}`)), slug).toBe(false);
    }
    expect(new Set(urls).size).toBe(urls.length);
    const kids = entries.find((e) => e.url === "https://example.test/en/kids-lessons");
    expect(kids?.alternates?.languages).toEqual({
      es: "https://example.test/es/kids-lessons",
      en: "https://example.test/en/kids-lessons",
    });
  });
});
