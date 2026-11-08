import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { APP_LOGIN_URL, appLoginUrl, CONTACT, LEARN_URL, SOCIAL } from "./site";

function keys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("site data", () => {
  it("contact data is the published one and external links are https", () => {
    expect(CONTACT.phoneE164).toBe("+61413178583");
    expect(CONTACT.email).toBe("hello@spanglish.com.au");
    for (const url of [LEARN_URL, ...SOCIAL.map((s) => s.href)]) expect(url).toMatch(/^https:\/\//);
  });

  it("the student portal login is https and localized", () => {
    expect(APP_LOGIN_URL).toMatch(/^https:\/\/[^/]+\/login$/);
    expect(appLoginUrl("es")).toMatch(/^https:\/\/[^/]+\/es\/login$/);
    expect(appLoginUrl("en")).toMatch(/^https:\/\/[^/]+\/en\/login$/);
  });

  it("es and en messages have exactly the same keys", () => {
    expect(keys(en).sort()).toEqual(keys(es).sort());
  });
});
