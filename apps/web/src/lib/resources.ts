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
  /** Destino de las tarjetas "open": la sección de videos o las lecciones de la web actual. */
  target?: "videos" | "learn";
};

export const ACCESS_LEVELS: readonly AccessLevel[] = ["public", "account", "enrolled"];

/**
 * PLACEHOLDER ESTÁTICO: estas tarjetas son provisionales y solo muestran cómo
 * se organizan los recursos. Cuando la plataforma (apps/app) tenga su tabla de
 * recursos con `access_level` (public | account | enrolled), esta lista se
 * sustituirá por los datos de esa tabla. No se inventan contenidos: lo que aún
 * no existe va como "soon" y sin enlace.
 */
export const RESOURCE_CARDS: readonly ResourceCard[] = [
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

export function cardsFor(access: AccessLevel): ResourceCard[] {
  return RESOURCE_CARDS.filter((c) => c.access === access);
}
