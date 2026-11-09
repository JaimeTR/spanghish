import { describe, expect, it } from "vitest";
import { formatAud, parseAudToCents } from "./money";

describe("parseAudToCents", () => {
  it("parseAudToCents('205.50') is 20550", () => {
    expect(parseAudToCents("205.50")).toBe(20550);
  });

  it("accepts whole dollars and one decimal", () => {
    expect(parseAudToCents("205")).toBe(20500);
    expect(parseAudToCents("205.5")).toBe(20550);
    expect(parseAudToCents(" 0 ")).toBe(0);
    expect(parseAudToCents("0.10")).toBe(10);
  });

  it("rejects '-1' and '1.234'", () => {
    expect(parseAudToCents("-1")).toBeNull();
    expect(parseAudToCents("1.234")).toBeNull();
  });

  it("rejects amounts over 100000 and garbage", () => {
    expect(parseAudToCents("100000")).toBe(10_000_000);
    expect(parseAudToCents("100000.01")).toBeNull();
    expect(parseAudToCents("")).toBeNull();
    expect(parseAudToCents("abc")).toBeNull();
    expect(parseAudToCents("1e3")).toBeNull();
    expect(parseAudToCents("$20")).toBeNull();
  });
});

describe("formatAud", () => {
  it("formatAud(20500) is '$205'", () => {
    expect(formatAud(20500)).toBe("$205");
  });

  it("shows cents when present", () => {
    expect(formatAud(20550)).toBe("$205.50");
    expect(formatAud(5)).toBe("$0.05");
    expect(formatAud(0)).toBe("$0");
  });
});
