import {
  parsePublishedLessonDetail,
  parsePublishedLessons,
  parsePublishedResources,
  type PublishedLessonDetail,
  type PublishedLessonSummary,
  type PublishedResource,
} from "@spanglish/content";
import { LEARN_CATEGORIES, LEVELS, type LearnCategory, type LearnItem, type LessonRoute, type Level } from "./learn/catalog";
import { getRpc } from "./platform";
import { ACCESS_LEVELS, cardsFor, FALLBACK_RESOURCE_CARDS, type ResourceCard, type ResourceKind } from "./resources";
import { VIDEOS, youtubeWatchUrl } from "./videos";

/**
 * Recursos y lecciones publicados en la plataforma, para la web pública.
 * La web lee como visitante anónimo: las funciones RPC devuelven lo restringido
 * marcado como `locked` y SIN su origen (video, enlace o archivo), así que aquí
 * nunca hay nada que ocultar. Si la plataforma no está configurada, falla o no
 * tiene nada publicado, se usa el respaldo estático.
 */

type Env = Partial<Record<string, string | undefined>>;
type Source = "db" | "fallback";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Icono de la tarjeta según el tipo de recurso de la plataforma. */
const KIND: Record<PublishedResource["kind"], ResourceKind> = {
  video: "video",
  document: "worksheets",
  worksheet: "worksheets",
  vocabulary: "vocabulary",
  recording: "recordings",
  coursework: "coursework",
  link: "lessons",
};

const both = (es: string | null, en: string | null): Record<"es" | "en", string> | undefined => {
  const a = es?.trim() || en?.trim();
  const b = en?.trim() || es?.trim();
  return a && b ? { es: a, en: b } : undefined;
};

function httpsUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Fila publicada → tarjeta. null si no se puede mostrar (sin título, o abierta pero sin origen válido). */
export function resourceToCard(row: PublishedResource): ResourceCard | null {
  const title = both(row.titleEs, row.titleEn);
  if (!title) return null;
  const base = {
    key: `db-${row.id}`,
    access: row.accessLevel,
    kind: KIND[row.kind],
    dbKind: row.kind,
    title,
    meta: both(row.descriptionEs, row.descriptionEn),
    titleLang: row.titleLang ?? undefined,
  } satisfies Partial<ResourceCard>;

  if (row.locked) return { ...base, state: "locked" };

  if (row.youtubeId && YOUTUBE_ID.test(row.youtubeId)) {
    // Los videos de la home ya se reproducen en esta página (sección de videos).
    if (VIDEOS.some((v) => v.id === row.youtubeId)) return { ...base, state: "open", videoId: row.youtubeId, target: "videos" };
    return { ...base, state: "open", href: youtubeWatchUrl(row.youtubeId), external: true };
  }
  const external = httpsUrl(row.externalUrl);
  if (external) return { ...base, state: "open", href: external, external: true };
  if (row.hasFile && UUID.test(row.id)) return { ...base, state: "open", href: `/api/resource-file/${row.id}` };
  return null;
}

/** Une lo publicado con el respaldo: un nivel de acceso sin recursos publicados conserva sus tarjetas de respaldo. */
export function mergeResourceCards(rows: readonly PublishedResource[]): ResourceCard[] {
  const cards = [...rows]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(resourceToCard)
    .filter((card): card is ResourceCard => card !== null);
  return ACCESS_LEVELS.flatMap((level) => {
    const published = cardsFor(level, cards);
    return published.length > 0 ? published : cardsFor(level);
  });
}

export async function getPublicResourceCards(
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<{ source: Source; cards: ResourceCard[] }> {
  const result = await getRpc<unknown>("list_published_resources", {}, env, fetchImpl);
  const rows = result.ok ? parsePublishedResources(result.data) : [];
  if (rows.map(resourceToCard).some((card) => card !== null)) return { source: "db", cards: mergeResourceCards(rows) };
  return { source: "fallback", cards: [...FALLBACK_RESOURCE_CARDS] };
}

const ROUTE: Record<"alphabet" | "nouns", LessonRoute> = { alphabet: "learnAlphabet", nouns: "learnNouns" };
const isLevel = (value: string | null): value is Level => (LEVELS as readonly string[]).includes(value ?? "");

/** Lección publicada → elemento del menú. null si no tiene a dónde enlazar. */
export function lessonToItem(row: PublishedLessonSummary): LearnItem | null {
  const title = both(row.titleEs, row.titleEn);
  if (!title || !SLUG.test(row.slug)) return null;
  const base: LearnItem = { key: `db-${row.id}`, title, level: isLevel(row.levelCode) ? row.levelCode : undefined };
  // Restringida: se ve en el portal, tras entrar.
  if (row.locked) return { ...base, slug: row.slug, locked: true };
  if (row.kind === "interactive") return row.componentKey ? { ...base, lesson: ROUTE[row.componentKey] } : null;
  return { ...base, slug: row.slug };
}

/**
 * Menú de Aprende ahora con lo publicado. "Fundamentos" son sus lecciones, en
 * orden; las categorías por nivel conservan los seis niveles: cada uno con sus
 * lecciones o, si no tiene, su hueco de "Próximamente". Una categoría sin nada
 * publicado conserva el respaldo.
 */
export function buildLearnCategories(rows: readonly PublishedLessonSummary[]): LearnCategory[] {
  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
  return LEARN_CATEGORIES.map((category) => {
    const items = sorted
      .filter((row) => row.category === category.key)
      .map(lessonToItem)
      .filter((item): item is LearnItem => item !== null);
    if (items.length === 0) return { ...category, items: [...category.items] };
    if (category.key === "foundations") return { ...category, items };
    const byLevel = LEVELS.flatMap((level): LearnItem[] => {
      const own = items.filter((item) => item.level === level);
      return own.length > 0 ? own : [{ key: `${category.key}-${level}`, level }];
    });
    return { ...category, items: [...byLevel, ...items.filter((item) => !item.level)] };
  });
}

async function publishedLessons(env: Env, fetchImpl: typeof fetch): Promise<PublishedLessonSummary[]> {
  const result = await getRpc<unknown>("list_published_lessons", {}, env, fetchImpl);
  return result.ok ? parsePublishedLessons(result.data) : [];
}

export async function getLearnCategories(
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<{ source: Source; categories: LearnCategory[] }> {
  const rows = await publishedLessons(env, fetchImpl);
  if (rows.some((row) => lessonToItem(row) !== null)) return { source: "db", categories: buildLearnCategories(rows) };
  return { source: "fallback", categories: LEARN_CATEGORIES.map((category) => ({ ...category, items: [...category.items] })) };
}

export type PublicLessonResult =
  | { status: "ok"; detail: PublishedLessonDetail }
  /** No existe, es restringida o no es un artículo (o la web no tiene plataforma). */
  | { status: "not_found" }
  /** La plataforma está configurada pero no responde: no se sabe si la lección existe. */
  | { status: "unavailable" };

/**
 * Lección artículo pública, con sus bloques. Distingue "no existe" de "la
 * plataforma no responde": lo segundo no debe guardarse en caché como un 404.
 */
export async function loadPublicLesson(
  slug: string,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<PublicLessonResult> {
  if (slug.length > 120 || !SLUG.test(slug)) return { status: "not_found" };
  const result = await getRpc<unknown>("get_published_lesson", { p_slug: slug }, env, fetchImpl);
  if (!result.ok) return { status: result.reason === "failed" ? "unavailable" : "not_found" };
  const detail = parsePublishedLessonDetail(result.data);
  return detail && detail.lesson.kind === "article" && detail.lesson.slug === slug ? { status: "ok", detail } : { status: "not_found" };
}

/** Como loadPublicLesson, pero null en cualquier caso que no sea una lección legible. */
export async function getPublicLesson(
  slug: string,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<PublishedLessonDetail | null> {
  const result = await loadPublicLesson(slug, env, fetchImpl);
  return result.status === "ok" ? result.detail : null;
}

/** Slugs de las lecciones artículo abiertas (para el sitemap). Vacío si la plataforma falla. */
export async function getPublicArticleSlugs(env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const rows = await publishedLessons(env, fetchImpl);
  return rows.filter((row) => row.kind === "article" && !row.locked && SLUG.test(row.slug)).map((row) => row.slug);
}
