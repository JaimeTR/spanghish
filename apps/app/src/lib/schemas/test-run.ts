import { z } from "zod";

/** Lo que el servidor entrega para hacer un test: preguntas sin respuestas correctas. */
export const attemptPayloadSchema = z.object({
  attempt_id: z.string(),
  started_at: z.string(),
  expires_at: z.string().nullable(),
  test: z.object({
    id: z.string(),
    title_es: z.string(),
    title_en: z.string(),
    description_es: z.string().nullable(),
    description_en: z.string().nullable(),
    pass_percent: z.number(),
    grade_scale: z.number(),
    time_limit_minutes: z.number().nullable(),
  }),
  questions: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["single", "truefalse", "fill"]),
      prompt_es: z.string(),
      prompt_en: z.string(),
      points: z.number(),
      options: z.array(z.object({ i: z.number(), text: z.string() })).nullable(),
    }),
  ),
});
export type AttemptPayload = z.infer<typeof attemptPayloadSchema>;
export type RunQuestion = AttemptPayload["questions"][number];

/** Resultado y revisión tras enviar. */
export const attemptResultSchema = z.object({
  attempt_id: z.string(),
  score: z.number(),
  max_score: z.number(),
  percent: z.number(),
  grade: z.number(),
  grade_scale: z.number(),
  passed: z.boolean(),
  late: z.boolean(),
  review: z.array(
    z.object({
      question_id: z.string(),
      correct: z.boolean(),
      given: z.union([z.number(), z.boolean(), z.string()]).nullable(),
      answer: z.union([z.number(), z.boolean(), z.string()]).nullable(),
      explanation_es: z.string().nullable(),
      explanation_en: z.string().nullable(),
    }),
  ),
});
export type AttemptResult = z.infer<typeof attemptResultSchema>;

export type AnswerValue = number | boolean | string;
