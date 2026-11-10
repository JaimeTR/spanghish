import { describe, expect, it } from "vitest";
import { webUrl } from "./web-url";

describe("webUrl", () => {
  it("builds the public-site address in the given language", () => {
    expect(webUrl("es", "", "https://web.example.test")).toBe("https://web.example.test/es");
    expect(webUrl("en", "contact-us", "https://web.example.test/")).toBe("https://web.example.test/en/contact-us");
    expect(webUrl("es", "/bookings", "https://web.example.test")).toBe("https://web.example.test/es/bookings");
  });

  it("is null without a usable base", () => {
    expect(webUrl("es", "", undefined)).toBeNull();
    expect(webUrl("es", "", "")).toBeNull();
    expect(webUrl("es", "", "not a url")).toBeNull();
    expect(webUrl("es", "", "javascript:alert(1)")).toBeNull();
  });
});
