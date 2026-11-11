import "server-only";
import type { Database, Tables } from "@spanglish/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { isUuid } from "./catalog";

type Client = SupabaseClient<Database>;
export type TestRow = Tables<"tests">;
export type TestQuestionRow = Tables<"test_questions">;

function fail(scope: string, error: { code?: string }): never {
  throw new Error(`${scope}: ${error.code ?? "error"}`);
}

// ---------------------------------------------------------------- Administración
export type AdminTestRow = TestRow & { levelCode: string | null; questionCount: number; attemptCount: number };

export async function listAdminTests(supabase: Client): Promise<AdminTestRow[]> {
  const { data, error } = await supabase
    .from("tests")
    .select("*, levels(code), test_questions(id), test_attempts(id)")
    .order("title_es");
  if (error) fail("listAdminTests", error);
  return data.map(({ levels, test_questions, test_attempts, ...row }) => ({
    ...row,
    levelCode: levels?.code ?? null,
    questionCount: test_questions.length,
    attemptCount: test_attempts.length,
  }));
}

export type AdminAttempt = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  percent: number;
  grade: number;
  passed: boolean;
  submittedAt: string;
};

export async function getAdminTest(
  supabase: Client,
  id: string,
): Promise<{ test: TestRow; questions: TestQuestionRow[]; sharedWith: string[]; attempts: AdminAttempt[] } | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase
    .from("tests")
    .select("*, test_questions(*), test_shares(user_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("getAdminTest", error);
  if (!data) return null;
  const { test_questions, test_shares, ...test } = data;

  const attemptsResult = await supabase
    .from("test_attempts")
    .select("id, user_id, percent, grade, passed, submitted_at")
    .eq("test_id", id)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(500);
  if (attemptsResult.error) fail("getAdminTest.attempts", attemptsResult.error);

  const userIds = [...new Set(attemptsResult.data.map((a) => a.user_id))];
  const names = new Map<string, { name: string; email: string | null }>();
  if (userIds.length) {
    const profiles = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
    if (profiles.error) fail("getAdminTest.profiles", profiles.error);
    for (const p of profiles.data) names.set(p.id, { name: p.full_name ?? p.email ?? "—", email: p.email });
  }

  return {
    test,
    questions: [...test_questions].sort((a, b) => a.position - b.position),
    sharedWith: test_shares.map((s) => s.user_id),
    attempts: attemptsResult.data.map((a) => ({
      id: a.id,
      userId: a.user_id,
      name: names.get(a.user_id)?.name ?? "—",
      email: names.get(a.user_id)?.email ?? null,
      percent: a.percent ?? 0,
      grade: Number(a.grade ?? 0),
      passed: a.passed ?? false,
      submittedAt: a.submitted_at ?? "",
    })),
  };
}

/** Cuentas con las que se puede compartir un test privado (alumnado, tutores y docentes). */
export async function listShareablePeople(supabase: Client): Promise<{ id: string; label: string }[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, user_roles(role)")
    .eq("status", "active")
    .order("full_name", { nullsFirst: false })
    .limit(500);
  if (error) fail("listShareablePeople", error);
  return data
    .filter((p) => p.user_roles.some((r) => r.role !== "admin"))
    .map((p) => ({ id: p.id, label: p.full_name ? `${p.full_name}${p.email ? ` (${p.email})` : ""}` : (p.email ?? p.id) }));
}

// ---------------------------------------------------------------- Alumnado (por RPC, sin respuestas)
export type AvailableTest = Database["public"]["Functions"]["list_available_tests"]["Returns"][number];
export type MyResult = Database["public"]["Functions"]["list_my_test_results"]["Returns"][number];

export async function listAvailableTests(supabase: Client): Promise<AvailableTest[]> {
  const { data, error } = await supabase.rpc("list_available_tests");
  if (error) fail("listAvailableTests", error);
  return data;
}

export async function listMyResults(supabase: Client): Promise<MyResult[]> {
  const { data, error } = await supabase.rpc("list_my_test_results");
  if (error) fail("listMyResults", error);
  return data;
}

const infoSchema = z.object({
  id: z.string(),
  title_es: z.string(),
  title_en: z.string(),
  description_es: z.string().nullable(),
  description_en: z.string().nullable(),
  level_code: z.string().nullable(),
  pass_percent: z.number(),
  grade_scale: z.number(),
  time_limit_minutes: z.number().nullable(),
  max_attempts: z.number().nullable(),
  question_count: z.number(),
  attempts: z.array(
    z.object({ id: z.string(), percent: z.number(), grade: z.number(), passed: z.boolean(), submitted_at: z.string() }),
  ),
});
export type TestInfo = z.infer<typeof infoSchema>;

export async function getTestInfo(supabase: Client, id: string): Promise<TestInfo | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase.rpc("get_test_info", { p_test_id: id });
  if (error) fail("getTestInfo", error);
  const parsed = infoSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
