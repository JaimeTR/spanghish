import { describe, expect, it } from "vitest";
import { navItemsFor, switchableAreas } from "./nav";
import { swapLocale } from "./locale-path";

describe("navItemsFor", () => {
  it("admin lists the operational sections in order", () => {
    expect(navItemsFor("admin").map((i) => i.key)).toEqual([
      "dashboard",
      "calendar",
      "groups",
      "students",
      "teachers",
      "leads",
      "requests",
      "catalog",
      "languages",
    ]);
    expect(navItemsFor("teacher").map((i) => i.key)).toEqual(["today", "groups", "requests"]);
  });

  it("teachers item has a route", () => {
    const teachers = navItemsFor("admin").find((i) => i.key === "teachers");
    expect(teachers?.href?.("es")).toBe("/es/admin/teachers");
    expect(teachers?.href?.("en")).toBe("/en/admin/teachers");
  });

  it("students item has a route", () => {
    expect(navItemsFor("admin").find((i) => i.key === "students")?.href?.("es")).toBe("/es/admin/students");
  });

  it("catalog item has a route", () => {
    expect(navItemsFor("admin").find((i) => i.key === "catalog")?.href?.("en")).toBe("/en/admin/catalog");
  });

  it("every linked item stays inside its own area", () => {
    for (const role of ["admin", "teacher", "student", "guardian"] as const) {
      const linked = navItemsFor(role).filter((i) => i.href !== null);
      expect(linked[0]!.href!("en")).toBe(`/en/${role}`);
      for (const i of linked) expect(i.href!("en")).toMatch(new RegExp(`^/en/${role}(/|$)`));
    }
  });

  it("student and guardian never get admin items", () => {
    const keys = [...navItemsFor("student"), ...navItemsFor("guardian")].map((i) => i.key);
    expect(keys).not.toContain("students");
    expect(keys).not.toContain("teachers");
    expect(keys).not.toContain("dashboard");
  });
});

describe("switchableAreas", () => {
  it("teacher+student gets exactly teacher and student, in priority order", () => {
    expect(switchableAreas(["student", "teacher"], "es")).toEqual([
      { area: "teacher", href: "/es/teacher" },
      { area: "student", href: "/es/student" },
    ]);
  });

  it("a single role has nothing to switch to beyond itself", () => {
    expect(switchableAreas(["student"], "en")).toEqual([{ area: "student", href: "/en/student" }]);
  });

  it("admin only lists its own role, not every area canAccess would allow", () => {
    expect(switchableAreas(["admin"], "es").map((a) => a.area)).toEqual(["admin"]);
  });
});

describe("swapLocale", () => {
  it("replaces the locale segment and keeps the rest of the path", () => {
    expect(swapLocale("/es/student", "en")).toBe("/en/student");
    expect(swapLocale("/en/admin/students/42", "es")).toBe("/es/admin/students/42");
  });

  it("handles the bare locale root and paths without a locale", () => {
    expect(swapLocale("/es", "en")).toBe("/en");
    expect(swapLocale("/", "en")).toBe("/en");
    expect(swapLocale("/student", "en")).toBe("/en/student");
  });
});
