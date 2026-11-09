import type { Locale } from "@/i18n/routing";

/**
 * Docentes públicas. Los textos de cada una (rol, biografía, datos) viven en
 * messages/{es,en}.json bajo `page.teachers.people.<key>`; aquí solo lo que no
 * es texto: ruta, foto y qué secciones del perfil lleva. Más adelante este
 * listado saldrá de la plataforma (módulo Docentes del admin).
 */
export type TeacherKey = "maribel" | "pamela";

export type Teacher = {
  key: TeacherKey;
  /** Segmento de la URL: /<locale>/teachers/<slug> (el nombre, como en la web antigua). */
  slug: string;
  name: string;
  photo: string;
  /** Posición del recorte de la foto dentro del marco (object-position). */
  photoPosition: string;
  /** Secciones extra del perfil (la forma de dar clase y los públicos son de Maribel). */
  approach: boolean;
  /** Nombre en schema.org y `knowsLanguage`. */
  knowsLanguage: string;
};

export const TEACHERS: readonly Teacher[] = [
  {
    key: "maribel",
    slug: "maribel-mayhua",
    name: "Maribel Mayhua",
    photo: "/maribel.webp",
    photoPosition: "50% 18%",
    approach: true,
    knowsLanguage: "es",
  },
  {
    key: "pamela",
    slug: "pamela-rojas",
    name: "Pamela Rojas",
    photo: "/pamela.webp",
    photoPosition: "50% 30%",
    approach: false,
    knowsLanguage: "es",
  },
];

export function teacherBySlug(slug: string): Teacher | undefined {
  return TEACHERS.find((t) => t.slug === slug);
}

/** Ruta con idioma del perfil de una docente. */
export function teacherPath(locale: Locale, slug: string): string {
  return `/${locale}/teachers/${slug}`;
}
