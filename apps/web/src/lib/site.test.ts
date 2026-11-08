import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { BOOKING_HREF, CONTACT, LEARN_URL, NAV_ITEMS, SOCIAL } from "./site";

function keys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("site data", () => {
  it("nav items are unique in-page anchors with a label in both locales", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const item of NAV_ITEMS) {
      expect(item.href).toBe(`#${item.key}`);
      expect(es.nav[item.key]).toBeTruthy();
      expect(en.nav[item.key]).toBeTruthy();
    }
  });

  it("the free-lesson CTA points at the contact section until /bookings exists", () => {
    expect(BOOKING_HREF).toBe("#contact");
  });

  it("contact data is the published one and external links are https", () => {
    expect(CONTACT.phoneE164).toBe("+61413178583");
    expect(CONTACT.email).toBe("hello@spanglish.com.au");
    for (const url of [LEARN_URL, ...SOCIAL.map((s) => s.href)]) expect(url).toMatch(/^https:\/\//);
  });

  it("es and en messages have exactly the same keys", () => {
    expect(keys(en).sort()).toEqual(keys(es).sort());
  });
});
