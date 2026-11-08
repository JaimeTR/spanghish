import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { AUDIENCES, relatedAudiences, type Audience } from "./lessons";
import { ROUTES } from "./routes";

const AUDIENCE_KEYS = Object.keys(AUDIENCES) as Audience[];

describe("lesson pages data", () => {
  it("ages are the published ones (kids 6 to 13, adults 14+, mature 65+)", () => {
    expect(AUDIENCES.adults).toMatchObject({ minAge: 14 });
    expect(AUDIENCES.kids).toMatchObject({ minAge: 6, maxAge: 13 });
    expect(AUDIENCES.mature).toMatchObject({ minAge: 65 });
    expect(es.common.audiences.kids.age).toBe("6–13");
    expect(en.common.audiences.kids.age).toBe("6–13");
  });

  it("each audience page has a route and copy for every FAQ, activity, format and place", () => {
    for (const locale of [es, en]) {
      for (const a of AUDIENCE_KEYS) {
        const data = AUDIENCES[a];
        expect(ROUTES[data.route]).toBeTruthy();
        const page = locale.page[a] as Record<string, unknown> & {
          faq: Record<string, { q: string; a: string }>;
          how: Record<string, unknown>;
        };
        for (const key of data.faq) expect(page.faq[key]?.q && page.faq[key]?.a, `${a} faq ${key}`).toBeTruthy();
        for (const key of data.activities) expect(page.how[key], `${a} how ${key}`).toBeTruthy();
        for (const group of data.formatGroups) {
          expect(locale.common.groups[group.key]).toBeTruthy();
          for (const f of group.formats) {
            expect(locale.common.formats[f.format]).toBeTruthy();
            for (const p of f.places) expect(locale.common.places[p], `place ${p}`).toBeTruthy();
          }
        }
        for (const key of data.prices) expect(locale.common.prices[key]).toBeTruthy();
      }
    }
  });

  it("JSON-LD prices come from the single price source", () => {
    // Mayores: $40 por clase, $390 por adelantado, $45 clase suelta (desde abril de 2026).
    expect(AUDIENCES.mature.offers.map((o) => o.price)).toEqual([0, 40, 390, 45]);
    expect(AUDIENCES.adults.offers.map((o) => o.price ?? o.minPrice)).toEqual([0, 30]);
  });

  it("related pages are the other two audiences", () => {
    expect(relatedAudiences("kids")).toEqual(["adults", "mature"]);
  });
});
