import { z } from "zod";
import {
  ACCESS_LEVELS,
  AUDIENCES,
  INTERACTIVE_KEYS,
  LEARN_CATEGORY_KEYS,
  LESSON_KINDS,
  RESOURCE_KINDS,
} from "./constants";

const nullableString = z.string().nullable();
const integer = z.number().int();

export const publishedResourceSchema = z.object({
  id: z.string(),
  kind: z.enum(RESOURCE_KINDS),
  accessLevel: z.enum(ACCESS_LEVELS),
  locked: z.boolean(),
  titleEs: z.string(),
  titleEn: z.string(),
  titleLang: z.enum(["es", "en"]).nullable(),
  descriptionEs: nullableString,
  descriptionEn: nullableString,
  levelCode: nullableString,
  audience: z.enum(AUDIENCES).nullable(),
  sortOrder: integer,
  thumbnailPath: nullableString,
  youtubeId: nullableString,
  externalUrl: nullableString,
  hasFile: z.boolean(),
});
export type PublishedResource = z.infer<typeof publishedResourceSchema>;

export const publishedLessonSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  kind: z.enum(LESSON_KINDS),
  componentKey: z.enum(INTERACTIVE_KEYS).nullable(),
  category: z.enum(LEARN_CATEGORY_KEYS),
  levelCode: nullableString,
  accessLevel: z.enum(ACCESS_LEVELS),
  locked: z.boolean(),
  titleEs: z.string(),
  titleEn: z.string(),
  summaryEs: nullableString,
  summaryEn: nullableString,
  sortOrder: integer,
});
export type PublishedLessonSummary = z.infer<typeof publishedLessonSummarySchema>;

const blockBase = { id: z.string(), position: integer };
const lessonBlockUnionSchema = z.discriminatedUnion("kind", [
  z.object({ ...blockBase, kind: z.literal("text"), bodyEs: z.string(), bodyEn: z.string() }),
  z.object({
    ...blockBase,
    kind: z.literal("image"),
    imagePath: z.string(),
    imageWidth: integer,
    imageHeight: integer,
    altEs: z.string(),
    altEn: z.string(),
  }),
  z.object({ ...blockBase, kind: z.literal("video"), youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/) }),
  z.object({
    ...blockBase,
    kind: z.literal("quiz"),
    bodyEs: z.string(),
    bodyEn: z.string(),
    optionsEs: z.array(z.string()),
    optionsEn: z.array(z.string()),
    correctOption: integer,
    explanationEs: z.string().nullable().default(null),
    explanationEn: z.string().nullable().default(null),
  }),
]);

export const lessonBlockSchema = lessonBlockUnionSchema.superRefine((block, context) => {
  if (block.kind !== "quiz") return;
  if (block.optionsEs.length < 2 || block.optionsEs.length > 4) {
    context.addIssue({ code: "custom", message: "El cuestionario debe tener entre 2 y 4 opciones.", path: ["optionsEs"] });
  }
  if (block.optionsEn.length !== block.optionsEs.length) {
    context.addIssue({ code: "custom", message: "Las opciones deben coincidir en ambos idiomas.", path: ["optionsEn"] });
  }
  if (block.correctOption < 0 || block.correctOption >= block.optionsEs.length) {
    context.addIssue({ code: "custom", message: "La opción correcta no existe.", path: ["correctOption"] });
  }
});
export type LessonBlock = z.infer<typeof lessonBlockSchema>;

export const publishedLessonDetailSchema = z.object({
  lesson: publishedLessonSummarySchema.omit({ locked: true }),
  blocks: z.array(lessonBlockSchema),
});
export type PublishedLessonDetail = z.infer<typeof publishedLessonDetailSchema>;

export function camelizeKeys(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase())] = entry;
  }
  return result;
}

export function parsePublishedResources(rows: unknown): PublishedResource[] {
  if (!Array.isArray(rows)) return [];
  const parsed: PublishedResource[] = [];
  for (const row of rows) {
    try {
      const result = publishedResourceSchema.safeParse(camelizeKeys(row));
      if (result.success) parsed.push(result.data);
    } catch {
      // Se omiten filas malformadas.
    }
  }
  return parsed;
}

export function parsePublishedLessons(rows: unknown): PublishedLessonSummary[] {
  if (!Array.isArray(rows)) return [];
  const parsed: PublishedLessonSummary[] = [];
  for (const row of rows) {
    try {
      const result = publishedLessonSummarySchema.safeParse(camelizeKeys(row));
      if (result.success) parsed.push(result.data);
    } catch {
      // Se omiten filas malformadas.
    }
  }
  return parsed;
}

export function parsePublishedLessonDetail(value: unknown): PublishedLessonDetail | null {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const source = value as Record<string, unknown>;
    if (!("lesson" in source) || !("blocks" in source)) return null;
    const lessonResult = publishedLessonSummarySchema.omit({ locked: true }).safeParse(camelizeKeys(source.lesson));
    if (!lessonResult.success) return null;
    const blocks: LessonBlock[] = [];
    if (Array.isArray(source.blocks)) {
      for (const block of source.blocks) {
        const result = lessonBlockSchema.safeParse(camelizeKeys(block));
        if (result.success) blocks.push(result.data);
      }
    }
    blocks.sort((left, right) => left.position - right.position);
    return { lesson: lessonResult.data, blocks };
  } catch {
    return null;
  }
}

export function pick(row: Record<string, unknown>, base: string, locale: "es" | "en"): string {
  const preferred = row[`${base}${locale === "es" ? "Es" : "En"}`];
  if (typeof preferred === "string" && preferred.length > 0) return preferred;
  const fallback = row[`${base}${locale === "es" ? "En" : "Es"}`];
  return typeof fallback === "string" && fallback.length > 0 ? fallback : "";
}
