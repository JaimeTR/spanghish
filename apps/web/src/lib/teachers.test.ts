import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { TEACHERS, teacherBySlug, teacherPath } from "./teachers";

describe("teachers", () => {
  it("lists Maribel and Pamela with unique slugs", () => {
    expect(TEACHERS.map((t) => t.slug)).toEqual(["maribel-mayhua", "pamela-rojas"]);
    expect(new Set(TEACHERS.map((t) => t.slug)).size).toBe(TEACHERS.length);
  });

  it("finds a teacher by slug and builds the localized path", () => {
    expect(teacherBySlug("pamela-rojas")?.name).toBe("Pamela Rojas");
    expect(teacherBySlug("nobody")).toBeUndefined();
    expect(teacherPath("en", "pamela-rojas")).toBe("/en/teachers/pamela-rojas");
  });

  it("every teacher has her texts in es and en, with the same number of facts", () => {
    for (const teacher of TEACHERS) {
      const a = (es.page.teachers.people as Record<string, Record<string, unknown>>)[teacher.key]!;
      const b = (en.page.teachers.people as Record<string, Record<string, unknown>>)[teacher.key]!;
      for (const key of ["role", "tagline", "metaDescription", "ask", "answer", "intro", "body", "factsLabel", "photoAlt"]) {
        expect(typeof a[key], `es ${teacher.key}.${key}`).toBe("string");
        expect(typeof b[key], `en ${teacher.key}.${key}`).toBe("string");
      }
      expect((a.facts as string[]).length).toBe((b.facts as string[]).length);
    }
  });
});
