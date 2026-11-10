import { describe, expect, it } from "vitest";
import { indexingEnabled, noindexHeaders, robotsRules } from "./indexing";

describe("indexing switch", () => {
  it("is on by default and off only with SITE_NOINDEX=1", () => {
    expect(indexingEnabled({})).toBe(true);
    expect(indexingEnabled({ SITE_NOINDEX: "0" })).toBe(true);
    expect(indexingEnabled({ SITE_NOINDEX: "true" })).toBe(true);
    expect(indexingEnabled({ SITE_NOINDEX: "1" })).toBe(false);
  });

  it("robots allows everything and lists the sitemap when indexing is on", () => {
    expect(robotsRules("https://example.test", {})).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://example.test/sitemap.xml",
      host: "https://example.test",
    });
  });

  it("robots disallows everything and drops the sitemap when indexing is off", () => {
    expect(robotsRules("https://example.test", { SITE_NOINDEX: "1" })).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  it("headers add X-Robots-Tag to every path only when indexing is off", () => {
    expect(noindexHeaders({})).toEqual([]);
    expect(noindexHeaders({ SITE_NOINDEX: "1" })).toEqual([
      { source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ]);
  });
});
