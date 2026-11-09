import { describe, expect, it } from "vitest";
import { extensionFor, UPLOAD_RULES } from "./constants";
import {
  lessonBlockSchema,
  parsePublishedLessonDetail,
  parsePublishedLessons,
  parsePublishedResources,
  pick,
} from "./published";

// Forma exacta que devuelve PostgREST para `rpc/list_published_resources`
// (fila real de `select * from list_published_resources()` en local).
const RESOURCE_ROW = {
  id: "c0000000-0000-4000-8000-000000000001",
  kind: "link",
  access_level: "public",
  locked: false,
  title_es: "Diccionario de la RAE",
  title_en: "RAE dictionary",
  title_lang: null,
  description_es: "Diccionario oficial de la lengua española.",
  description_en: "The official Spanish dictionary.",
  level_code: null,
  audience: null,
  sort_order: 40,
  thumbnail_path: null,
  youtube_id: null,
  external_url: "https://dle.rae.es/",
  has_file: false,
};

const LESSON_ROW = {
  id: "c0000000-0000-4000-8000-000000000021",
  slug: "colores-local",
  kind: "article",
  component_key: null,
  category: "kids",
  level_code: "A1",
  access_level: "public",
  locked: false,
  title_es: "Los colores",
  title_en: "Colours",
  summary_es: "Aprende los colores básicos.",
  summary_en: "Learn the basic colours.",
  sort_order: 10,
};

describe("parsePublished*", () => {
  it("parsePublishedResources maps snake_case to camelCase and drops a row with an unknown kind", () => {
    const parsed = parsePublishedResources([RESOURCE_ROW, { ...RESOURCE_ROW, id: "x", kind: "podcast" }]);
    expect(parsed).toEqual([
      {
        id: RESOURCE_ROW.id,
        kind: "link",
        accessLevel: "public",
        locked: false,
        titleEs: "Diccionario de la RAE",
        titleEn: "RAE dictionary",
        titleLang: null,
        descriptionEs: "Diccionario oficial de la lengua española.",
        descriptionEn: "The official Spanish dictionary.",
        levelCode: null,
        audience: null,
        sortOrder: 40,
        thumbnailPath: null,
        youtubeId: null,
        externalUrl: "https://dle.rae.es/",
        hasFile: false,
      },
    ]);
  });

  it("never throws on garbage input", () => {
    expect(parsePublishedResources(null)).toEqual([]);
    expect(parsePublishedResources({ not: "an array" })).toEqual([]);
    expect(parsePublishedLessons([1, "x", null])).toEqual([]);
    expect(parsePublishedLessonDetail(null)).toBeNull();
    expect(parsePublishedLessonDetail({ lesson: { id: 1 }, blocks: [] })).toBeNull();
  });

  it("parsePublishedLessons maps a lesson row", () => {
    expect(parsePublishedLessons([LESSON_ROW])[0]).toMatchObject({
      slug: "colores-local",
      componentKey: null,
      levelCode: "A1",
      locked: false,
      summaryEn: "Learn the basic colours.",
    });
  });

  it("parsePublishedLessonDetail keeps valid blocks in order and drops invalid ones", () => {
    const { locked: _locked, ...lesson } = LESSON_ROW;
    const detail = parsePublishedLessonDetail({
      lesson,
      blocks: [
        { id: "b1", position: 10, kind: "text", body_es: "Hola", body_en: "Hello" },
        { id: "b2", position: 20, kind: "video", youtube_id: "short" },
        {
          id: "b3",
          position: 30,
          kind: "quiz",
          body_es: "¿Rojo?",
          body_en: "Red?",
          options_es: ["rojo", "azul"],
          options_en: ["red", "blue"],
          correct_option: 0,
          explanation_es: null,
          explanation_en: null,
        },
      ],
    });
    expect(detail?.lesson.slug).toBe("colores-local");
    expect(detail?.lesson).not.toHaveProperty("locked");
    expect(detail?.blocks.map((b) => b.id)).toEqual(["b1", "b3"]);
  });
});

describe("lessonBlockSchema", () => {
  const quiz = {
    id: "q",
    position: 10,
    kind: "quiz",
    bodyEs: "¿?",
    bodyEn: "?",
    optionsEs: ["a", "b", "c"],
    optionsEn: ["a", "b", "c"],
    correctOption: 2,
    explanationEs: null,
    explanationEn: null,
  };

  it("lessonBlockSchema rejects a quiz whose correctOption is out of range", () => {
    expect(lessonBlockSchema.safeParse(quiz).success).toBe(true);
    expect(lessonBlockSchema.safeParse({ ...quiz, correctOption: 3 }).success).toBe(false);
    expect(lessonBlockSchema.safeParse({ ...quiz, correctOption: -1 }).success).toBe(false);
    expect(lessonBlockSchema.safeParse({ ...quiz, optionsEn: ["a", "b"] }).success).toBe(false);
    expect(lessonBlockSchema.safeParse({ ...quiz, optionsEs: ["a"], optionsEn: ["a"], correctOption: 0 }).success).toBe(
      false,
    );
  });
});

describe("pick", () => {
  it("pick falls back to the other locale when empty", () => {
    const row = { titleEs: "Hola", titleEn: "", summaryEs: null, summaryEn: "Hi" };
    expect(pick(row, "title", "es")).toBe("Hola");
    expect(pick(row, "title", "en")).toBe("Hola");
    expect(pick(row, "summary", "es")).toBe("Hi");
    expect(pick(row, "missing", "es")).toBe("");
  });
});

describe("UPLOAD_RULES", () => {
  it("extensionFor maps every allowed mime", () => {
    const all = [...UPLOAD_RULES.resourceFile.mimeTypes, ...UPLOAD_RULES.contentImage.mimeTypes];
    expect(all.map((m) => extensionFor(m))).toEqual(["pdf", "png", "jpg", "mp3", "docx", "pptx", "png", "jpg", "webp"]);
    expect(extensionFor("text/html")).toBeNull();
    expect(extensionFor("image/svg+xml")).toBeNull();
    expect(extensionFor("constructor")).toBeNull();
    expect(extensionFor("__proto__")).toBeNull();
  });
});
