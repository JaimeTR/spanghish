import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getRpc } from "./platform";
import { TEACHERS } from "./teachers";
import { rowToView, type TeacherRow, type TeacherView } from "./teachers-rows";

export type { TeacherRow, TeacherView } from "./teachers-rows";

/** Respaldo estático (messages + lib/teachers.ts): se usa si la plataforma no está configurada, falla o no tiene perfiles. */
async function fallbackViews(locale: Locale): Promise<TeacherView[]> {
  return Promise.all(
    TEACHERS.map(async (teacher) => {
      const p = await getTranslations({ locale, namespace: `page.teachers.people.${teacher.key}` });
      return {
        slug: teacher.slug,
        name: teacher.name,
        photo: teacher.photo,
        photoPosition: teacher.photoPosition,
        photoAlt: p("photoAlt"),
        role: p("role"),
        tagline: p("tagline"),
        metaDescription: p("metaDescription"),
        intro: p("intro"),
        body: p("body"),
        specialty: p.has("specialty") ? p("specialty") : undefined,
        enrolTitle: p.has("enrolTitle") ? p("enrolTitle") : undefined,
        enrol: p.has("enrol") ? p("enrol") : undefined,
        facts: p.raw("facts") as string[],
        showApproach: teacher.approach,
      };
    }),
  );
}

/** Docentes publicadas, en orden. La base manda; si falla o viene vacía, el respaldo estático. */
export async function loadTeachers(locale: Locale): Promise<{ source: "db" | "fallback"; teachers: TeacherView[] }> {
  const result = await getRpc<TeacherRow[]>("list_published_teachers");
  if (result.ok && result.data.length > 0) {
    return { source: "db", teachers: result.data.map((row) => rowToView(row, locale)) };
  }
  return { source: "fallback", teachers: await fallbackViews(locale) };
}

export async function loadTeacher(locale: Locale, slug: string): Promise<TeacherView | undefined> {
  const { teachers } = await loadTeachers(locale);
  return teachers.find((t) => t.slug === slug);
}

/** Slugs publicados (para el sitemap y las rutas estáticas). */
export async function loadTeacherSlugs(): Promise<string[]> {
  const result = await getRpc<TeacherRow[]>("list_published_teachers");
  if (result.ok && result.data.length > 0) return result.data.map((row) => row.slug);
  return TEACHERS.map((t) => t.slug);
}
