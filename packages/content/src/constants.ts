export const ACCESS_LEVELS = ["public", "account", "enrolled"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export const CONTENT_STATUSES = ["draft", "published"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const RESOURCE_KINDS = ["video", "document", "link", "worksheet", "vocabulary", "recording", "coursework"] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const LEARN_CATEGORY_KEYS = ["foundations", "kids", "adults", "stories", "games"] as const;
export type LearnCategoryKey = (typeof LEARN_CATEGORY_KEYS)[number];

export const LESSON_KINDS = ["interactive", "article"] as const;
export type LessonKind = (typeof LESSON_KINDS)[number];

export const INTERACTIVE_KEYS = ["alphabet", "nouns"] as const;
export type InteractiveKey = (typeof INTERACTIVE_KEYS)[number];

export const BLOCK_KINDS = ["text", "image", "video", "quiz"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

export const LEVEL_CODES = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type LevelCode = (typeof LEVEL_CODES)[number];

export const AUDIENCES = ["kids", "adults", "mature"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const UPLOAD_RULES = {
  resourceFile: {
    bucket: "resource-files",
    maxBytes: 26_214_400,
    mimeTypes: [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "audio/mpeg",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  },
  contentImage: { bucket: "content-media", maxBytes: 2_097_152, mimeTypes: ["image/png", "image/jpeg", "image/webp"] },
} as const;

// Map (no objeto literal): "constructor" o "__proto__" no deben dar una extensión.
const EXTENSIONS = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["audio/mpeg", "mp3"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
  ["image/webp", "webp"],
]);

export function extensionFor(mime: string): string | null {
  return EXTENSIONS.get(mime) ?? null;
}
