import type { PublishedLessonSummary } from "@spanglish/content";

export const LEARN_CATEGORIES = ["foundations", "kids", "adults", "stories", "games"] as const;
export const LEARN_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export function groupLessons(lessons: PublishedLessonSummary[]) {
  return LEARN_CATEGORIES.map((category) => ({ category, lessons: lessons.filter((lesson) => lesson.category === category).sort((a, b) => (a.levelCode ?? "").localeCompare(b.levelCode ?? "") || a.sortOrder - b.sortOrder) }));
}
