import { VIDEOS } from "./videos";

/**
 * Niveles de acceso de los recursos, los mismos que usará la plataforma:
 * - public: libre, sin cuenta.
 * - account: con una cuenta (el alta pública todavía está cerrada).
 * - enrolled: solo alumnos matriculados.
 */
export type AccessLevel = "public" | "account" | "enrolled";

/**
 * - open: se usa ya (enlace al recurso).
 * - soon: aún no existe; tarjeta informativa, sin enlace.
 * - locked: existe tras el login del portal; la tarjeta enlaza al login.
 */
export type ResourceState = "open" | "soon" | "locked";

export type ResourceKind = "video" | "lessons" | "worksheets" | "vocabulary" | "recordings" | "coursework";

export type ResourceCard = {
  key: string;
  access: AccessLevel;
  state: ResourceState;
  kind: ResourceKind;
  /** Solo en los videos: id de YouTube (título publicado en VIDEOS). */
  videoId?: string;
  /** Destino de las tarjetas "open": la sección de videos o Aprende ahora (/learn). */
  target?: "videos" | "learn";
  /** Solo en las tarjetas de la plataforma: textos propios (no están en messages). */
  title?: Record<"es" | "en", string>;
  meta?: Record<"es" | "en", string>;
  /** Idioma del título cuando no es el de la interfaz (p. ej. un video en inglés). */
  titleLang?: "es" | "en";
  /** Tipo en la plataforma: da el texto secundario cuando no hay descripción. */
  dbKind?: "video" | "document" | "link" | "worksheet" | "vocabulary" | "recording" | "coursework";
  /** Enlace directo (video o web externa, o la descarga firmada /api/resource-file/<id>). */
  href?: string;
  /** El enlace sale de la web: se abre en una pestaña nueva. */
  external?: boolean;
};

export const ACCESS_LEVELS: readonly AccessLevel[] = ["public", "account", "enrolled"];

/**
 * RESPALDO ESTÁTICO: lo que se muestra si la plataforma no está configurada,
 * falla o un nivel de acceso aún no tiene recursos publicados (ver
 * content-source.ts). No se inventan contenidos: lo que aún no existe va como
 * "soon" y sin enlace.
 */
export const FALLBACK_RESOURCE_CARDS: readonly ResourceCard[] = [
  ...VIDEOS.map(
    (v): ResourceCard => ({ key: `video-${v.id}`, access: "public", state: "open", kind: "video", videoId: v.id, target: "videos" }),
  ),
  { key: "learnLegacy", access: "public", state: "open", kind: "lessons", target: "learn" },
  { key: "worksheets", access: "public", state: "soon", kind: "worksheets" },
  { key: "vocabulary", access: "public", state: "soon", kind: "vocabulary" },
  { key: "interactive", access: "account", state: "soon", kind: "lessons" },
  { key: "recordings", access: "enrolled", state: "locked", kind: "recordings" },
  { key: "coursework", access: "enrolled", state: "locked", kind: "coursework" },
];

/** Alias histórico del respaldo. */
export const RESOURCE_CARDS = FALLBACK_RESOURCE_CARDS;

export function cardsFor(access: AccessLevel, cards: readonly ResourceCard[] = FALLBACK_RESOURCE_CARDS): ResourceCard[] {
  return cards.filter((c) => c.access === access);
}
