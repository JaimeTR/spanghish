import { describe, expect, it } from "vitest";
import { canAccess, displayName, isSafeRedirect, roleHomePath, toSessionUser } from "./access";

describe("roleHomePath", () => {
  it("roleHomePath prefers admin over teacher", () => {
    expect(roleHomePath(["teacher", "admin"], "es")).toBe("/es/admin");
    expect(roleHomePath(["guardian", "student"], "en")).toBe("/en/student");
  });
  it("roleHomePath returns login with no roles", () => {
    expect(roleHomePath([], "es")).toBe("/es/login");
  });
});

describe("canAccess", () => {
  it("canAccess blocks student from /es/admin", () => {
    expect(canAccess(["student"], "/es/admin")).toBe(false);
    expect(canAccess([], "/es/student")).toBe(false);
    expect(canAccess(["teacher"], "/es/guardian/x")).toBe(false);
  });
  it("canAccess matches on path segments, not prefixes", () => {
    expect(canAccess(["student"], "/es/administrator-x")).toBe(true);
    expect(canAccess(["student"], "/es/admin/students")).toBe(false);
    expect(canAccess([], "/es/login")).toBe(true);
    expect(canAccess([], "/es")).toBe(true);
    expect(canAccess([], "/es/forgot-password")).toBe(true);
  });
  it("canAccess lets admin into teacher and student areas", () => {
    expect(canAccess(["admin"], "/en/teacher/classes")).toBe(true);
    expect(canAccess(["admin"], "/en/student")).toBe(true);
    expect(canAccess(["admin"], "/en/guardian")).toBe(true);
    expect(canAccess(["teacher"], "/en/teacher")).toBe(true);
  });
});

describe("canAccess fail-closed", () => {
  it("canAccess denies a path with no locale (/admin, /admin/users)", () => {
    expect(canAccess(["admin"], "/admin")).toBe(false);
    expect(canAccess(["student"], "/admin/users")).toBe(false);
  });
  it("canAccess denies an unknown locale (/fr/admin)", () => {
    expect(canAccess(["admin"], "/fr/admin")).toBe(false);
    expect(canAccess([], "/fr/login")).toBe(false);
  });
  it("canAccess normalizes empty segments (/es//admin blocks a student)", () => {
    expect(canAccess(["student"], "/es//admin")).toBe(false);
  });
  it("canAccess decodes percent-encoding (/es/%61dmin blocks a student)", () => {
    expect(canAccess(["student"], "/es/%61dmin")).toBe(false);
  });
  it("canAccess denies on malformed encoding (/es/%E0%A4%A)", () => {
    expect(canAccess(["admin"], "/es/%E0%A4%A")).toBe(false);
  });
  it("canAccess is case-insensitive on area (/es/ADMIN blocks a student)", () => {
    expect(canAccess(["student"], "/es/ADMIN")).toBe(false);
  });
  it("public paths stay public for everyone (/es, /es/login, /en/forgot-password)", () => {
    for (const p of ["/es", "/es/login", "/en/forgot-password", "/es/foo/admin"]) {
      expect(canAccess([], p)).toBe(true);
    }
  });
});

describe("toSessionUser hardening", () => {
  it("drops unknown role values", () => {
    const u = toSessionUser(
      { id: "u3", status: "active", preferred_locale: "es" },
      [{ role: "student" }, { role: "root" as never }],
    );
    expect(u.roles).toEqual(["student"]);
  });
  it("falls back to es for an unknown locale", () => {
    const u = toSessionUser(
      { id: "u4", status: "active", preferred_locale: "fr" as never },
      [],
    );
    expect(u.locale).toBe("es");
  });
});

describe("isSafeRedirect", () => {
  it("isSafeRedirect rejects '//evil.com' and 'https://x.com'", () => {
    expect(isSafeRedirect("//evil.com")).toBe(false);
    expect(isSafeRedirect("https://x.com")).toBe(false);
    expect(isSafeRedirect(null)).toBe(false);
  });
  it("isSafeRedirect accepts '/es/student/courses'", () => {
    expect(isSafeRedirect("/es/student/courses")).toBe(true);
  });
  it("isSafeRedirect rejects backslash and newline tricks", () => {
    expect(isSafeRedirect("/" + String.fromCharCode(92) + "evil.com")).toBe(false);
    expect(isSafeRedirect("/es" + String.fromCharCode(92) + "x")).toBe(false);
    expect(isSafeRedirect("/es/x\nSet-Cookie: a=b")).toBe(false);
    expect(isSafeRedirect("/\t/evil.com")).toBe(false);
    expect(isSafeRedirect("javascript:alert(1)")).toBe(false);
    expect(isSafeRedirect("")).toBe(false);
  });
});

describe("toSessionUser", () => {
  it("an unknown profile status fails closed as suspended", () => {
    const u = toSessionUser({ id: "u9", status: "pending", preferred_locale: "fr" }, [{ role: "admin" }]);
    expect(u).toEqual({ id: "u9", roles: [], status: "suspended", locale: "es" });
  });
  it("suspended user is treated as no access", () => {
    const u = toSessionUser(
      { id: "u1", status: "suspended", preferred_locale: "en" },
      [{ role: "admin" }],
    );
    expect(u).toEqual({ id: "u1", roles: [], status: "suspended", locale: "en" });
    expect(roleHomePath(u.roles, u.locale)).toBe("/en/login");
  });
  it("keeps the trimmed full_name as name and omits a blank one", () => {
    const named = toSessionUser(
      { id: "u5", status: "active", preferred_locale: "es", full_name: "  Ana Pérez " },
      [{ role: "student" }],
    );
    expect(named.name).toBe("Ana Pérez");
    const blank = toSessionUser(
      { id: "u6", status: "active", preferred_locale: "es", full_name: "   " },
      [{ role: "student" }],
    );
    expect(blank.name).toBeUndefined();
  });
  it("keeps the trimmed email only to show, and displayName falls back to it when there is no name", () => {
    const named = toSessionUser(
      { id: "u7", status: "active", preferred_locale: "es", full_name: "Ana Pérez", email: " ana@example.test " },
      [{ role: "student" }],
    );
    expect(named.email).toBe("ana@example.test");
    expect(displayName(named)).toBe("Ana Pérez");
    const unnamed = toSessionUser(
      { id: "u8", status: "active", preferred_locale: "es", full_name: null, email: "jaime@example.test" },
      [{ role: "admin" }],
    );
    expect(displayName(unnamed)).toBe("jaime@example.test");
    expect(displayName({})).toBeUndefined();
  });
  it("a suspended user exposes neither name nor email", () => {
    const u = toSessionUser(
      { id: "u10", status: "suspended", preferred_locale: "es", full_name: "Ana", email: "ana@example.test" },
      [{ role: "student" }],
    );
    expect(u.name).toBeUndefined();
    expect(u.email).toBeUndefined();
  });
  it("teacher with student role keeps both roles", () => {
    const u = toSessionUser(
      { id: "u2", status: "active", preferred_locale: "es" },
      [{ role: "teacher" }, { role: "student" }],
    );
    expect(u.roles).toEqual(["teacher", "student"]);
    expect(u.status).toBe("active");
  });
});
