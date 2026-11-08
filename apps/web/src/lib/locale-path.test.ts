import { describe, expect, it } from "vitest";
import { swapLocale } from "./locale-path";

describe("swapLocale", () => {
  it("replaces the locale segment and keeps the rest of the path", () => {
    expect(swapLocale("/es", "en")).toBe("/en");
    expect(swapLocale("/en/lessons/kids", "es")).toBe("/es/lessons/kids");
  });

  it("prefixes paths without a locale and handles the root", () => {
    expect(swapLocale("/", "en")).toBe("/en");
    expect(swapLocale("/learn", "es")).toBe("/es/learn");
    expect(swapLocale("/es/", "en")).toBe("/en");
  });
});
