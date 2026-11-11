import { z } from "zod";
import { ACCESS_LEVELS } from "@spanglish/content";
import { checkbox } from "./catalog";

export const TEST_VISIBILITIES = ["private", "portal", "link"] as const;
export const GRADE_SCALES = ["10", "20", "100"] as const;
export const QUESTION_KINDS = ["single", "truefalse", "fill"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

const optionalText = (max: number) => z.string().trim().max(max).optional();
const optionalInt = (min: number, max: number) => z.coerce.number().int().min(min).max(max).optional();

/** Líneas no vacías de un cuadro de texto. */
export function splitLines(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Ajustes de un test: datos, quién lo ve, nota y comportamiento dinámico. */
export const testSchema = z.object({
  id: z.uuid().optional(),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80),
  titleEs: z.string().trim().min(1).max(120),
  titleEn: z.string().trim().min(1).max(120),
  descriptionEs: optionalText(500),
  descriptionEn: optionalText(500),
  levelId: z.uuid().optional(),
  audience: z.enum(["kids", "adults", "mature"]).optional(),
  accessLevel: z.enum(ACCESS_LEVELS),
  visibility: z.enum(TEST_VISIBILITIES),
  inResources: checkbox,
  passPercent: z.coerce.number().int().min(1).max(100),
  gradeScale: z.enum(GRADE_SCALES),
  timeLimit: optionalInt(1, 240),
  maxAttempts: optionalInt(1, 20),
  perAttempt: optionalInt(1, 100),
  shuffleQuestions: checkbox,
  shuffleOptions: checkbox,
});
export type TestInput = z.infer<typeof testSchema>;
export type TestField = keyof z.input<typeof testSchema> & string;

/** Una pregunta del banco: opción única, verdadero/falso o respuesta escrita. */
export const questionSchema = z
  .object({
    id: z.uuid().optional(),
    testId: z.uuid(),
    kind: z.enum(QUESTION_KINDS),
    promptEs: z.string().trim().min(1).max(600),
    promptEn: z.string().trim().min(1).max(600),
    options: z.string().optional(),
    correctOption: optionalInt(1, 5),
    correctBool: z.enum(["true", "false"]).optional(),
    accepted: z.string().optional(),
    explanationEs: optionalText(500),
    explanationEn: optionalText(500),
    points: z.coerce.number().int().min(1).max(10).default(1),
  })
  .superRefine((q, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (q.kind === "single") {
      const options = splitLines(q.options);
      if (options.length < 2 || options.length > 5 || options.some((o) => o.length > 120)) add("options", "invalid");
      if (!q.correctOption) add("correctOption", "required");
      else if (q.correctOption > options.length) add("correctOption", "range");
    }
    if (q.kind === "truefalse" && !q.correctBool) add("correctBool", "required");
    if (q.kind === "fill") {
      const accepted = splitLines(q.accepted);
      if (accepted.length < 1 || accepted.length > 6 || accepted.some((a) => a.length > 80)) add("accepted", "invalid");
    }
  });
export type QuestionInput = z.infer<typeof questionSchema>;
export type QuestionField = keyof z.input<typeof questionSchema> & string;

export const testIdSchema = z.object({ id: z.uuid() });
export const publishTestSchema = z.object({ id: z.uuid(), publish: z.enum(["true", "false"]) });
export const moveQuestionSchema = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) });
