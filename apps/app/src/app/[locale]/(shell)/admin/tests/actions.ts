"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { requireArea } from "@/lib/require-area";
import {
  moveQuestionSchema,
  publishTestSchema,
  questionSchema,
  splitLines,
  testIdSchema,
  testSchema,
  type QuestionField,
  type TestField,
} from "@/lib/schemas/tests";
import { createClient } from "@/lib/supabase/server";

const refresh = (locale: string, testId?: string) => {
  revalidatePath(`/${locale}/admin/tests`);
  if (testId) revalidatePath(`/${locale}/admin/tests/${testId}`);
  revalidatePath(`/${locale}/student/tests`);
  revalidatePath(`/${locale}/student/resources`);
};

/** Crea o actualiza los ajustes de un test. Al crear, redirige a su ficha. */
export async function saveTest(_prev: ActionState<TestField>, formData: FormData): Promise<ActionState<TestField>> {
  const locale = actionLocale(formData);
  const user = await requireArea(locale, "admin");
  const parsed = parseForm(testSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const d = parsed.data;
  const db = await createClient();

  const values = {
    slug: d.slug,
    title_es: d.titleEs,
    title_en: d.titleEn,
    description_es: d.descriptionEs ?? null,
    description_en: d.descriptionEn ?? null,
    level_id: d.levelId ?? null,
    audience: d.audience ?? null,
    access_level: d.accessLevel,
    visibility: d.visibility,
    in_resources: d.inResources,
    pass_percent: d.passPercent,
    grade_scale: Number(d.gradeScale),
    time_limit_minutes: d.timeLimit ?? null,
    max_attempts: d.maxAttempts ?? null,
    questions_per_attempt: d.perAttempt ?? null,
    shuffle_questions: d.shuffleQuestions,
    shuffle_options: d.shuffleOptions,
  };

  const fail = (error: Parameters<typeof toDomainError>[0]): ActionState<TestField> => {
    const domain = toDomainError(error);
    return domain === "slug_taken" ? { status: "invalid", fieldErrors: { slug: "slugTaken" } } : { status: "error", error: domain };
  };

  if (d.id) {
    const { error } = await db.from("tests").update(values).eq("id", d.id);
    if (error) return fail(error);
    refresh(locale, d.id);
    return { status: "ok" };
  }
  const { data: created, error } = await db.from("tests").insert({ ...values, created_by: user.id }).select("id").single();
  if (error) return fail(error);
  refresh(locale);
  redirect(`/${locale}/admin/tests/${created.id}`);
}

export async function setTestPublished(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(publishTestSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const publish = parsed.data.publish === "true";
  const db = await createClient();
  const { error } = await db
    .from("tests")
    .update({ status: publish ? "published" : "draft", published_at: publish ? new Date().toISOString() : null })
    .eq("id", parsed.data.id);
  if (error) return { status: "error", error: toDomainError(error) };
  refresh(locale, parsed.data.id);
  return { status: "ok" };
}

export async function deleteTest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(testIdSchema, formData);
  if (!parsed.ok) return { status: "error", error: "not_found" };
  const { error } = await (await createClient()).from("tests").delete().eq("id", parsed.data.id);
  if (error) return { status: "error", error: toDomainError(error) };
  refresh(locale);
  return { status: "ok" };
}

/** Crea o edita una pregunta del banco. */
export async function saveQuestion(
  _prev: ActionState<QuestionField>,
  formData: FormData,
): Promise<ActionState<QuestionField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(questionSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const d = parsed.data;
  const db = await createClient();

  const values = {
    kind: d.kind,
    prompt_es: d.promptEs,
    prompt_en: d.promptEn,
    options: d.kind === "single" ? splitLines(d.options) : null,
    correct_option: d.kind === "single" ? (d.correctOption ?? 1) - 1 : null,
    correct_bool: d.kind === "truefalse" ? d.correctBool === "true" : null,
    accepted_answers: d.kind === "fill" ? splitLines(d.accepted) : null,
    explanation_es: d.explanationEs ?? null,
    explanation_en: d.explanationEn ?? null,
    points: d.points,
  };

  if (d.id) {
    const { error } = await db.from("test_questions").update(values).eq("id", d.id);
    if (error) return { status: "error", error: toDomainError(error) };
  } else {
    const { data: last } = await db
      .from("test_questions")
      .select("position")
      .eq("test_id", d.testId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await db.from("test_questions").insert({ ...values, test_id: d.testId, position: (last?.position ?? 0) + 10 });
    if (error) return { status: "error", error: toDomainError(error) };
  }
  refresh(locale, d.testId);
  return { status: "ok" };
}

export async function deleteQuestion(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(testIdSchema, formData);
  if (!parsed.ok) return { status: "error", error: "not_found" };
  const testId = formData.get("testId");
  const { error } = await (await createClient()).from("test_questions").delete().eq("id", parsed.data.id);
  if (error) return { status: "error", error: toDomainError(error) };
  refresh(locale, typeof testId === "string" ? testId : undefined);
  return { status: "ok" };
}

export async function moveQuestion(formData: FormData): Promise<void> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(moveQuestionSchema, formData);
  if (!parsed.ok) return;
  const db = await createClient();
  const { data: question } = await db.from("test_questions").select("test_id").eq("id", parsed.data.id).maybeSingle();
  const { error } = await db.rpc("move_test_question", { p_question_id: parsed.data.id, p_direction: parsed.data.direction });
  if (error) throw error;
  if (question) refresh(locale, question.test_id);
}

/** Con quién se comparte un test privado: reemplaza la lista completa. */
export async function setTestShares(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const testId = formData.get("testId");
  if (typeof testId !== "string" || !/^[0-9a-f-]{36}$/i.test(testId)) return { status: "error", error: "not_found" };
  const userIds = [...new Set(formData.getAll("userId").filter((v): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v)))];

  const db = await createClient();
  const removed = await db.from("test_shares").delete().eq("test_id", testId);
  if (removed.error) return { status: "error", error: toDomainError(removed.error) };
  if (userIds.length) {
    const added = await db.from("test_shares").insert(userIds.map((user_id) => ({ test_id: testId, user_id })));
    if (added.error) return { status: "error", error: toDomainError(added.error) };
  }
  refresh(locale, testId);
  return { status: "ok" };
}
