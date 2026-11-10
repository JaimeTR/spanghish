import { describe, expect, it } from "vitest";
import { hasRevalidateSecret, isAuthorizedRevalidate, MIN_REVALIDATE_SECRET } from "./revalidate";

const SECRET = "s".repeat(MIN_REVALIDATE_SECRET);

describe("revalidate secret", () => {
  it("a missing or short secret counts as not configured", () => {
    expect(hasRevalidateSecret(undefined)).toBe(false);
    expect(hasRevalidateSecret("")).toBe(false);
    expect(hasRevalidateSecret("s".repeat(MIN_REVALIDATE_SECRET - 1))).toBe(false);
    expect(hasRevalidateSecret(SECRET)).toBe(true);
  });

  it("accepts only the exact Bearer secret", () => {
    expect(isAuthorizedRevalidate(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(isAuthorizedRevalidate(`bearer ${SECRET}`, SECRET)).toBe(true);
    expect(isAuthorizedRevalidate(SECRET, SECRET)).toBe(false);
    expect(isAuthorizedRevalidate(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isAuthorizedRevalidate(`Bearer ${"t".repeat(MIN_REVALIDATE_SECRET)}`, SECRET)).toBe(false);
    expect(isAuthorizedRevalidate(null, SECRET)).toBe(false);
    expect(isAuthorizedRevalidate("Bearer short", "short")).toBe(false);
    expect(isAuthorizedRevalidate("Bearer undefined", undefined)).toBe(false);
  });
});
