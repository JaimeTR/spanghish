import type { RouteKey } from "../routes";

/**
 * Aprende ahora (/learn): la misma estructura que el menú "Learn Spanish" de
 * spanglish.com.au (Spanish Foundations, Kids Category y Adults Category por
 * niveles A1–C2, Histories y Games). En esa web casi todo enlazaba a "#": solo
 * había dos lecciones reales, el alfabeto y los sustantivos y artículos (esta
 * última publicada también como Adults > Level A1). El resto se muestra como
 * "Próximamente", sin enlace: no se inventa contenido.
 */
export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof LEVELS)[number];

export type LessonRoute = Extract<RouteKey, "learnAlphabet" | "learnNouns">;

export type LearnItem = {
  key: string;
  /** Texto: `page.learn.items.<label>` o, en las categorías por nivel, "Nivel A1". */
  label?: "alphabet" | "nouns" | "colors" | "numbers";
  level?: Level;
  /** Lección publicada; sin ella, el elemento es "Próximamente". */
  lesson?: LessonRoute;
};

export type LearnCategory = {
  key: "foundations" | "kids" | "adults" | "stories" | "games";
  tone: "yellow" | "fuchsia" | "purple" | "burgundy" | "white";
  items: LearnItem[];
};

/** Lecciones publicadas, en orden (anterior / siguiente). */
export const LESSONS: readonly { route: LessonRoute; label: "alphabet" | "nouns" }[] = [
  { route: "learnAlphabet", label: "alphabet" },
  { route: "learnNouns", label: "nouns" },
];

const byLevel = (prefix: string, lessons: Partial<Record<Level, LessonRoute>> = {}): LearnItem[] =>
  LEVELS.map((level) => ({ key: `${prefix}-${level}`, level, lesson: lessons[level] }));

export const LEARN_CATEGORIES: readonly LearnCategory[] = [
  {
    key: "foundations",
    tone: "yellow",
    items: [
      { key: "alphabet", label: "alphabet", lesson: "learnAlphabet" },
      { key: "nouns", label: "nouns", lesson: "learnNouns" },
      { key: "colors", label: "colors" },
      { key: "numbers", label: "numbers" },
    ],
  },
  { key: "kids", tone: "fuchsia", items: byLevel("kids") },
  { key: "adults", tone: "purple", items: byLevel("adults", { A1: "learnNouns" }) },
  { key: "stories", tone: "burgundy", items: byLevel("stories") },
  { key: "games", tone: "white", items: byLevel("games") },
];

/** Lección anterior y siguiente de una lección publicada. */
export function lessonNeighbours(route: LessonRoute) {
  const i = LESSONS.findIndex((l) => l.route === route);
  return { prev: i > 0 ? LESSONS[i - 1] : undefined, next: i >= 0 && i < LESSONS.length - 1 ? LESSONS[i + 1] : undefined };
}
