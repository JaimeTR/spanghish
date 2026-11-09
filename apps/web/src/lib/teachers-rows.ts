import type { Locale } from "@/i18n/routing";
import { contentMediaUrl } from "./platform";
import { TEACHERS } from "./teachers";

/** Una docente lista para pintar, ya en el idioma de la página. */
export type TeacherView = {
  slug: string;
  name: string;
  /** URL de la foto (absoluta de Storage, o ruta de /public en el respaldo); null si aún no tiene. */
  photo: string | null;
  photoPosition: string;
  photoAlt: string;
  role: string;
  tagline: string;
  metaDescription: string;
  intro: string;
  body: string;
  specialty?: string;
  enrolTitle?: string;
  enrol?: string;
  facts: string[];
  /** Muestra "Cómo son sus clases" y "A quién da clase" (la forma de dar clase es de Maribel por ahora). */
  showApproach: boolean;
};

/** Fila de `list_published_teachers()`. */
export type TeacherRow = {
  slug: string;
  name: string;
  photo_path: string | null;
  photo_position: string;
  photo_alt_es: string;
  photo_alt_en: string;
  role_es: string;
  role_en: string;
  tagline_es: string;
  tagline_en: string;
  meta_description_es: string;
  meta_description_en: string;
  intro_es: string;
  intro_en: string;
  body_es: string;
  body_en: string;
  specialty_es: string | null;
  specialty_en: string | null;
  enrol_title_es: string | null;
  enrol_title_en: string | null;
  enrol_es: string | null;
  enrol_en: string | null;
  facts_es: string[];
  facts_en: string[];
  show_approach: boolean;
  sort_order: number;
};

/** Convierte una fila de la plataforma al idioma pedido (pura). */
export function rowToView(row: TeacherRow, locale: Locale, env?: Record<string, string | undefined>): TeacherView {
  const pick = <K extends string>(base: K) => row[`${base}_${locale}` as keyof TeacherRow];
  return {
    slug: row.slug,
    name: row.name,
    // Sin foto subida, las docentes de siempre conservan la de /public hasta que la administración suba una.
    photo: contentMediaUrl(row.photo_path, env) ?? TEACHERS.find((t) => t.slug === row.slug)?.photo ?? null,
    photoPosition: row.photo_position,
    photoAlt: pick("photo_alt") as string,
    role: pick("role") as string,
    tagline: pick("tagline") as string,
    metaDescription: pick("meta_description") as string,
    intro: pick("intro") as string,
    body: pick("body") as string,
    specialty: (pick("specialty") as string | null) ?? undefined,
    enrolTitle: (pick("enrol_title") as string | null) ?? undefined,
    enrol: (pick("enrol") as string | null) ?? undefined,
    facts: pick("facts") as string[],
    showApproach: row.show_approach,
  };
}
