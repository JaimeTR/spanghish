import { z } from "zod";
import { ACCESS_LEVELS, LEARN_CATEGORY_KEYS, RESOURCE_KINDS, parseYouTubeId } from "@spanglish/content";
import { checkbox } from "./catalog";

const optionalText = (max: number) => z.string().trim().max(max).optional();
const bilingual = {
  titleEs: z.string().trim().min(1).max(120), titleEn: z.string().trim().min(1).max(120),
};
export const resourceSchema = z.object({
  id: z.uuid().optional(), kind: z.enum(RESOURCE_KINDS), accessLevel: z.enum(ACCESS_LEVELS), ...bilingual,
  titleLang: z.enum(["es", "en"]).optional(), descriptionEs: optionalText(500), descriptionEn: optionalText(500),
  levelId: z.uuid().optional(), audience: z.enum(["kids", "adults", "mature"]).optional(),
  externalUrl: z.url({ protocol: /^https$/ }).max(500).optional(), video: z.string().trim().max(200).optional(),
  teaserPublic: checkbox,
}).transform((data) => ({ ...data, youtubeId: parseYouTubeId(data.video ?? "") }))
  .superRefine((data, ctx) => {
    if (data.video && !data.youtubeId) ctx.addIssue({ code: "custom", path: ["video"], message: "invalid" });
    if (data.kind === "link" && !data.externalUrl) ctx.addIssue({ code: "custom", path: ["externalUrl"], message: "required" });
    if (data.youtubeId && data.externalUrl) ctx.addIssue({ code: "custom", path: ["externalUrl"], message: "invalid" });
  });
export type ResourceInput = z.infer<typeof resourceSchema>;
export type ResourceField = keyof z.input<typeof resourceSchema> & string;

export const lessonSchema = z.object({
  id: z.uuid().optional(), slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80),
  category: z.enum(LEARN_CATEGORY_KEYS), levelId: z.uuid().optional(), accessLevel: z.enum(ACCESS_LEVELS),
  ...bilingual, summaryEs: optionalText(300), summaryEn: optionalText(300), teaserPublic: checkbox,
}).superRefine((data, ctx) => {
  if (data.category !== "foundations" && !data.levelId) ctx.addIssue({ code: "custom", path: ["levelId"], message: "required" });
});
export type LessonInput = z.infer<typeof lessonSchema>;
export type LessonField = keyof z.input<typeof lessonSchema> & string;

const base = { lessonId: z.uuid(), id: z.uuid().optional() };
const textBlock = z.object({ ...base, kind: z.literal("text"), bodyEs: z.string().trim().min(1).max(5000), bodyEn: z.string().trim().min(1).max(5000) });
const imageBlock = z.object({ ...base, kind: z.literal("image"), imagePath: z.string().min(1), imageWidth: z.coerce.number().int().min(1).max(4000), imageHeight: z.coerce.number().int().min(1).max(4000), altEs: z.string().trim().min(1).max(200), altEn: z.string().trim().min(1).max(200) });
const videoBlock = z.object({ ...base, kind: z.literal("video"), video: z.string().trim().min(1).max(200) }).superRefine((value, ctx) => {
  if (!parseYouTubeId(value.video)) ctx.addIssue({ code: "custom", path: ["video"], message: "invalid" });
});
const quizBlock = z.object({ ...base, kind: z.literal("quiz"), bodyEs: z.string().trim().min(1).max(1000), bodyEn: z.string().trim().min(1).max(1000), optionsEs: z.string(), optionsEn: z.string(), correctOption: z.coerce.number().int().min(0).max(3), explanationEs: optionalText(500), explanationEn: optionalText(500) })
  .superRefine((value, ctx) => {
    const optionsEs = value.optionsEs.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    const optionsEn = value.optionsEn.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    if (optionsEs.length < 2 || optionsEs.length > 4 || optionsEs.some((item) => item.length > 120)) ctx.addIssue({ code: "custom", path: ["optionsEs"], message: "invalid" });
    if (optionsEn.length < 2 || optionsEn.length > 4 || optionsEn.some((item) => item.length > 120)) ctx.addIssue({ code: "custom", path: ["optionsEn"], message: "invalid" });
    if (value.correctOption >= optionsEs.length) ctx.addIssue({ code: "custom", path: ["correctOption"], message: "range" });
    if (optionsEs.length !== optionsEn.length) ctx.addIssue({ code: "custom", path: ["optionsEn"], message: "invalid" });
  });
export const blockSchema = z.discriminatedUnion("kind", [textBlock, imageBlock, videoBlock, quizBlock]);
export type BlockInput = z.infer<typeof blockSchema>;
export type BlockField = string;
export const moveSchema = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) });
export const publishSchema = z.object({ id: z.uuid(), publish: z.enum(["true", "false"]) });
