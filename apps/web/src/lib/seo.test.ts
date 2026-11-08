import { describe, expect, it } from "vitest";
import { ROUTE_KEYS } from "./routes";
import { pageMetadata, sitemapEntries } from "./seo";

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
  });
});

describe("sitemapEntries", () => {
  it("lists every route in both locales with absolute URLs and alternates", () => {
    const entries = sitemapEntries("https://example.test");
    expect(entries).toHaveLength(ROUTE_KEYS.length * 2);
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://example.test/es");
    expect(urls).toContain("https://example.test/en/mature-lessons");
    expect(urls).toContain("https://example.test/es/contact-us");
    expect(new Set(urls).size).toBe(urls.length);
    const kids = entries.find((e) => e.url === "https://example.test/en/kids-lessons");
    expect(kids?.alternates?.languages).toEqual({
      es: "https://example.test/es/kids-lessons",
      en: "https://example.test/en/kids-lessons",
    });
  });
});
