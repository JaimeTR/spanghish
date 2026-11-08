import { describe, expect, it } from "vitest";
import { isLocale } from "./routing";

describe("isLocale", () => {
  it("accepts es and en", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("en")).toBe(true);
  });

  it("rejects 'fr' and ''", () => {
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
  });
});
