import { describe, expect, it } from "vitest";
import { guardRequest, hasUnsafeSegment, safeNextTarget } from "./route-guard";

describe("hasUnsafeSegment", () => {
  it("accepts normal paths", () => {
    expect(hasUnsafeSegment("/es/admin")).toBe(false);
    expect(hasUnsafeSegment("/es/%61dmin")).toBe(false);
    expect(hasUnsafeSegment("/")).toBe(false);
  });

  it("rejects . and .. segments, plain or percent-encoded", () => {
    expect(hasUnsafeSegment("/es/./admin")).toBe(true);
    expect(hasUnsafeSegment("/es/student/../admin")).toBe(true);
    expect(hasUnsafeSegment("/es/student/%2e%2e/admin")).toBe(true);
    expect(hasUnsafeSegment("/es/%2E/admin")).toBe(true);
  });

  it("rejects control characters and encoded separators inside a segment", () => {
    expect(hasUnsafeSegment("/es/ad%00min")).toBe(true);
    expect(hasUnsafeSegment("/es/admin%0a")).toBe(true);
    expect(hasUnsafeSegment("/es/x%2Fadmin")).toBe(true);
    expect(hasUnsafeSegment("/es/x%5Cadmin")).toBe(true);
  });

  it("rejects invalid percent-encoding", () => {
    expect(hasUnsafeSegment("/es/%E0%A4%A")).toBe(true);
  });
});

describe("safeNextTarget", () => {
  it("returns next when safe and allowed for the roles", () => {
    expect(safeNextTarget("/es/teacher/groups", ["teacher"])).toBe("/es/teacher/groups");
  });

  it("rejects protocol-relative, absolute and unsafe paths", () => {
    expect(safeNextTarget("//evil.com", ["admin"])).toBeNull();
    expect(safeNextTarget("https://evil.com", ["admin"])).toBeNull();
    expect(safeNextTarget("/es/student/../admin", ["admin"])).toBeNull();
    expect(safeNextTarget(null, ["admin"])).toBeNull();
  });

  it("rejects a next the roles cannot access", () => {
    expect(safeNextTarget("/es/admin", ["student"])).toBeNull();
  });
});

describe("guardRequest", () => {
  const active = (roles: ("admin" | "teacher" | "student" | "guardian")[]) => ({
    roles,
    status: "active" as const,
  });

  it("rejects unsafe paths before anything else", () => {
    expect(guardRequest("/es/student/%2e%2e/admin", "", active(["admin"]))).toEqual({
      kind: "reject",
    });
  });

  it("allows public pages without a session", () => {
    expect(guardRequest("/es/login", "", null)).toEqual({ kind: "allow" });
    expect(guardRequest("/en/forgot-password", "", null)).toEqual({ kind: "allow" });
  });

  it("sends anonymous users on protected areas to login with next", () => {
    expect(guardRequest("/es/admin", "", null)).toEqual({
      kind: "redirect",
      to: "/es/login?next=%2Fes%2Fadmin",
    });
    expect(guardRequest("/en/student/x", "?a=1", null)).toEqual({
      kind: "redirect",
      to: "/en/login?next=%2Fen%2Fstudent%2Fx%3Fa%3D1",
    });
  });

  it("detects the area on the decoded, case-folded segment", () => {
    expect(guardRequest("/es/%61dmin", "", null)).toEqual({
      kind: "redirect",
      to: "/es/login?next=%2Fes%2F%2561dmin",
    });
    expect(guardRequest("/es/%61dmin", "", active(["student"]))).toEqual({
      kind: "redirect",
      to: "/es/student",
    });
  });

  it("redirects users without access to their role home", () => {
    expect(guardRequest("/es/admin", "", active(["student"]))).toEqual({
      kind: "redirect",
      to: "/es/student",
    });
    expect(guardRequest("/en/admin", "", active(["teacher", "student"]))).toEqual({
      kind: "redirect",
      to: "/en/teacher",
    });
  });

  it("allows users with access", () => {
    expect(guardRequest("/es/admin", "", active(["admin"]))).toEqual({ kind: "allow" });
    expect(guardRequest("/es/student", "", active(["teacher", "student"]))).toEqual({
      kind: "allow",
    });
  });

  it("signs suspended users out on any page", () => {
    const suspended = { roles: [], status: "suspended" as const };
    expect(guardRequest("/es/student", "", suspended)).toEqual({
      kind: "redirect",
      to: "/es/login?error=suspended",
      signOut: true,
    });
    expect(guardRequest("/en/login", "", suspended)).toEqual({
      kind: "redirect",
      to: "/en/login?error=suspended",
      signOut: true,
    });
  });

  it("fails closed when there is no valid locale", () => {
    expect(guardRequest("/admin", "", active(["admin"]))).toEqual({
      kind: "redirect",
      to: "/es/login",
    });
  });
});
