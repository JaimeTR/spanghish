import { describe, expect, it } from "vitest";
import { navItemsFor, switchableAreas } from "./nav";
import { swapLocale } from "./locale-path";

describe("navItemsFor", () => {
  it("admin lists dashboard, students, teachers and languages; only the dashboard is a route", () => {
    const items = navItemsFor("admin");
    expect(items.map((i) => i.key)).toEqual(["dashboard", "students", "teachers", "languages"]);
    expect(items[0]!.href?.("es")).toBe("/es/admin");
    expect(items.slice(1).every((i) => i.href === null)).toBe(true);
  });

  it("every available item points at its role home (the only routes that exist yet)", () => {
    for (const role of ["admin", "teacher", "student", "guardian"] as const) {
      const linked = navItemsFor(role).filter((i) => i.href !== null);
      expect(linked.map((i) => i.href!("en"))).toEqual([`/en/${role}`]);
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
