import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { APP_LOGIN_URL, appLoginUrl, CONTACT, SOCIAL } from "./site";

function keys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("site data", () => {
  it("contact data is the published one and external links are https", () => {
    expect(CONTACT.phoneE164).toBe("+61413178583");
    expect(CONTACT.email).toBe("hello@spanglish.com.au");
    for (const url of SOCIAL.map((s) => s.href)) expect(url).toMatch(/^https:\/\//);
  });

  it("the student portal login is https and localized", () => {
    expect(APP_LOGIN_URL).toMatch(/^https:\/\/[^/]+\/login$/);
    expect(appLoginUrl("es")).toMatch(/^https:\/\/[^/]+\/es\/login$/);
    expect(appLoginUrl("en")).toMatch(/^https:\/\/[^/]+\/en\/login$/);
  });

  it("the login only carries a return path inside the student portal of the same locale", () => {
    expect(appLoginUrl("es", "/es/student/learn/los-colores")).toMatch(/\/es\/login\?next=%2Fes%2Fstudent%2Flearn%2Flos-colores$/);
    for (const next of ["/en/student/resources", "https://evil.example", "//evil.example", "/es/admin", "/es/student//evil", "/es/student/\\evil"]) {
      expect(appLoginUrl("es", next), next).toMatch(/\/es\/login$/);
    }
  });

  it("es and en messages have exactly the same keys", () => {
    expect(keys(en).sort()).toEqual(keys(es).sort());
  });
});
