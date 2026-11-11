import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { devModules, NAV, navGroupsFor, navItemsFor, navUrl, switchableAreas } from "./nav";
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

  it("navGroupsFor puts what is finished on top and what is in development at the bottom", () => {
    // Admin: la portada, luego los grupos con algo listo y al final el que solo tiene módulos en desarrollo.
    expect(navGroupsFor("admin").map((g) => g.group)).toEqual([null, "operation", "people", "content", "management"]);
    // Dentro de un grupo, lo listo va antes que lo que está en desarrollo.
    expect(navGroupsFor("admin").find((g) => g.group === "management")?.items.map((i) => i.key)).toEqual([
      "catalog",
      "products",
      "payments",
      "legal",
      "settings",
    ]);
    expect(navGroupsFor("student").map((g) => g.group)).toEqual([null, "learn", "classes", "account"]);
    for (const role of ROLES) {
      let seenDevOnly = false;
      for (const { group, items } of navGroupsFor(role)) {
        const devOnly = group !== null && items.every((i) => i.status === "dev");
        if (devOnly) seenDevOnly = true;
        else expect(seenDevOnly, `${role}: un grupo con módulos listos va después de uno solo en desarrollo`).toBe(false);
        const firstDev = items.findIndex((i) => i.status === "dev");
        if (firstDev >= 0) expect(items.slice(firstDev).every((i) => i.status === "dev"), `${role}.${group}`).toBe(true);
      }
    }
  });

  it("marks as ready only the modules that exist", () => {
    const readyKeys = ROLES.flatMap((r) =>
      NAV[r].filter((i) => i.status === "ready").map((i) => `${r}.${i.key}`),
    );
    expect(readyKeys).toEqual([
      "admin.dashboard",
      "admin.groups",
      "admin.enrollments",
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
      "student.home",
      "student.resources",
      "student.learn",
      "student.tests",
    ]);
  });

  it("a ready module points to a real page", () => {
    for (const role of ROLES) {
      for (const item of NAV[role].filter((i) => i.status === "ready")) {
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

  it("a dev module uses /<area>/<key> and no real page shadows it", () => {
    for (const role of ROLES) {
      for (const item of NAV[role].filter((i) => i.status === "dev")) {
        expect(item.href).toBe(`/${role}/${item.key}`);
        expect(existsSync(path.join(SHELL, role, item.key)), `${role}/${item.key} exists`).toBe(false);
      }
    }
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

  it("devModules returns the dev keys of an area", () => {
    expect(devModules("admin")).toEqual(["calendar", "attendance"]);
    expect(devModules("teacher")).toHaveLength(6);
    expect(devModules("student")).toHaveLength(6);
    expect(devModules("guardian")).toHaveLength(5);
  });

  it("every item has a label and every dev module its texts in es and en", () => {
    for (const messages of [es, en]) {
      expect(typeof lookup(messages, "nav.status.dev")).toBe("string");
      for (const role of ROLES) {
        for (const item of NAV[role]) {
          expect(typeof lookup(messages, `nav.items.${item.key}`), `nav.items.${item.key}`).toBe("string");
          if (item.status !== "dev") continue;
          // Texto por área: el mismo módulo (p. ej. "groups") es distinto para admin y docente.
          const base = `devModules.${role}.${item.key}`;
          for (const field of ["title", "summary", "previewLabel"]) {
            const value = lookup(messages, `${base}.${field}`);
            expect(typeof value === "string" && value.length > 0, `${base}.${field}`).toBe(true);
          }
          const bullets = lookup(messages, `${base}.bullets`);
          expect(Array.isArray(bullets), `${base}.bullets`).toBe(true);
          expect((bullets as unknown[]).length).toBeGreaterThanOrEqual(3);
          expect((bullets as unknown[]).length).toBeLessThanOrEqual(5);
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
