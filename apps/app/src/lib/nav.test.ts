import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { NAV, navGroupsFor, navItemsFor, navUrl, switchableAreas } from "./nav";
import { swapLocale } from "./locale-path";

const ROLES = ["admin", "teacher", "student", "guardian"] as const;
const SHELL = path.resolve(__dirname, "../app/[locale]/(shell)");

function lookup(messages: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object" && k in acc) return (acc as Record<string, unknown>)[k];
    return undefined;
  }, messages);
}

describe("NAV", () => {
  it("lists every module of each role, in order", () => {
    expect(NAV.admin.map((i) => i.key)).toEqual([
      "dashboard",
      "calendar",
      "groups",
      "enrollments",
      "attendance",
      "requests",
      "leads",
      "users",
      "students",
      "teachers",
      "content",
      "lessons",
      "tests",
      "catalog",
      "products",
      "payments",
      "legal",
      "settings",
    ]);
    expect(NAV.teacher.map((i) => i.key)).toEqual([
      "today",
      "groups",
      "calendar",
      "attendance",
      "requests",
      "assignments",
      "resources",
    ]);
    expect(NAV.student.map((i) => i.key)).toEqual([
      "home",
      "schedule",
      "courses",
      "requests",
      "resources",
      "learn",
      "tests",
      "assignments",
      "progress",
      "payments",
    ]);
    expect(NAV.guardian.map((i) => i.key)).toEqual(["children", "schedule", "payments", "consents", "resources"]);
  });

  it("navGroupsFor keeps every module once and never repeats a group", () => {
    for (const role of ROLES) {
      const groups = navGroupsFor(role);
      expect(groups.flatMap((g) => g.items.map((i) => i.key)).sort()).toEqual(NAV[role].map((i) => i.key).sort());
      const titled = groups.map((g) => g.group).filter((g) => g !== null);
      expect(new Set(titled).size, `${role} repite un grupo`).toBe(titled.length);
    }
  });

  it("navGroupsFor puts the home on top and keeps the order of NAV", () => {
    // Admin: la portada, luego los grupos en el orden de aparición.
    expect(navGroupsFor("admin").map((g) => g.group)).toEqual([null, "operation", "people", "content", "management"]);
    expect(navGroupsFor("admin").find((g) => g.group === "management")?.items.map((i) => i.key)).toEqual([
      "catalog",
      "products",
      "payments",
      "legal",
      "settings",
    ]);
    expect(navGroupsFor("student").map((g) => g.group)).toEqual([null, "classes", "learn", "account"]);
  });

  it("lists every module of the portal", () => {
    const readyKeys = ROLES.flatMap((r) =>
      NAV[r].map((i) => `${r}.${i.key}`),
    );
    expect(readyKeys).toEqual([
      "admin.dashboard",
      "admin.calendar",
      "admin.groups",
      "admin.enrollments",
      "admin.attendance",
      "admin.requests",
      "admin.leads",
      "admin.users",
      "admin.students",
      "admin.teachers",
      "admin.content",
      "admin.lessons",
      "admin.tests",
      "admin.catalog",
      "admin.products",
      "admin.payments",
      "admin.legal",
      "admin.settings",
      "teacher.today",
      "teacher.groups",
      "teacher.calendar",
      "teacher.attendance",
      "teacher.requests",
      "teacher.assignments",
      "teacher.resources",
      "student.home",
      "student.schedule",
      "student.courses",
      "student.requests",
      "student.resources",
      "student.learn",
      "student.tests",
      "student.assignments",
      "student.progress",
      "student.payments",
      "guardian.children",
      "guardian.schedule",
      "guardian.payments",
      "guardian.consents",
      "guardian.resources",
    ]);
  });

  it("every module points to a real page", () => {
    for (const role of ROLES) {
      for (const item of NAV[role]) {
        expect(existsSync(path.join(SHELL, item.href, "page.tsx")), `${item.href}/page.tsx`).toBe(true);
      }
    }
  });

  it("admin has resources and lessons routes", () => {
    expect(NAV.admin.find((item) => item.key === "content")?.href).toBe("/admin/resources");
    expect(NAV.admin.find((item) => item.key === "lessons")?.href).toBe("/admin/lessons");
  });
  it("student library points to /student/resources", () => {
    expect(NAV.student.find((item) => item.key === "resources")?.href).toBe("/student/resources");
  });

  it("every item stays inside its own area and keys are unique within it", () => {
    for (const role of ROLES) {
      const keys = NAV[role].map((i) => i.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const i of NAV[role]) {
        expect(i.area).toBe(role);
        expect(navUrl(i, "en")).toMatch(new RegExp(`^/en/${role}(/|$)`));
      }
    }
  });

  it("every item has a label in es and en", () => {
    for (const messages of [es, en]) {
      for (const role of ROLES) {
        for (const item of NAV[role]) {
          expect(typeof lookup(messages, `nav.items.${item.key}`), `nav.items.${item.key}`).toBe("string");
        }
      }
    }
  });

  it("student and guardian never get admin items", () => {
    for (const i of [...navItemsFor("student"), ...navItemsFor("guardian")]) {
      expect(i.href).not.toMatch(/^\/admin/);
    }
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
