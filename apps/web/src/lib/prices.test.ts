import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { aud, PRICE_VALUES, PRICES } from "./prices";

function strings(obj: unknown): string[] {
  if (typeof obj === "string") return [obj];
  if (typeof obj !== "object" || obj === null) return [];
  return Object.values(obj).flatMap(strings);
}

describe("prices (single source of truth)", () => {
  it("are the ones published on spanglish.com.au", () => {
    expect(PRICES).toEqual({
      free: 0,
      groupFrom: 30,
      matureLesson: 40,
      matureUpfront: 390,
      matureSingle: 45,
      onlineUpfront: 245,
      onlineLesson: 25,
      nineWeekUpfront: 310,
      sixWeekUpfront: 205,
      editionLesson: 35,
    });
    expect(aud(30)).toBe("$30");
    expect(PRICE_VALUES.matureUpfront).toBe("$390");
  });

  it("messages never hard-code an amount: they use {placeholders}", () => {
    for (const locale of [es, en]) {
      const offenders = strings(locale).filter((s) => /\$\d/.test(s));
      expect(offenders).toEqual([]);
    }
  });

  it("every price placeholder used in messages exists", () => {
    const names = new Set(Object.keys(PRICES));
    const PRICE_LIKE = /\{(groupFrom|mature\w*|online\w*|\w*Upfront|editionLesson)\}/g;
    for (const locale of [es, en]) {
      for (const s of strings(locale)) {
        for (const m of s.matchAll(PRICE_LIKE)) expect(names.has(m[1]!), m[0]).toBe(true);
      }
    }
  });
});
