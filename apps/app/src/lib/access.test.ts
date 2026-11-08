import { describe, expect, it } from "vitest";
import { canAccess, isSafeRedirect, roleHomePath, toSessionUser } from "./access";

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
  it("suspended user is treated as no access", () => {
    const u = toSessionUser(
      { id: "u1", status: "suspended", preferred_locale: "en" },
      [{ role: "admin" }],
    );
    expect(u).toEqual({ id: "u1", roles: [], status: "suspended", locale: "en" });
    expect(roleHomePath(u.roles, u.locale)).toBe("/en/login");
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
