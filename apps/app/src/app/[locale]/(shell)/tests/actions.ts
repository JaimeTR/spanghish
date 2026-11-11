"use server";

import { toDomainError, type DomainError } from "@/lib/db-errors";
import {
  attemptPayloadSchema,
  attemptResultSchema,
  type AnswerValue,
  type AttemptPayload,
  type AttemptResult,
} from "@/lib/schemas/test-run";
import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type Outcome<T> = { ok: true; data: T } | { ok: false; error: DomainError };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function signedIn(): Promise<boolean> {
  const user = await getSessionUser();
  return Boolean(user && user.status === "active" && user.roles.length > 0);
}

/** Empieza (o retoma) un intento: la base elige y baraja las preguntas. */
export async function startTestAction(testId: string): Promise<Outcome<AttemptPayload>> {
  if (!(await signedIn()) || !UUID.test(testId)) return { ok: false, error: "forbidden" };
  const { data, error } = await (await createClient()).rpc("start_test", { p_test_id: testId });
  if (error) return { ok: false, error: toDomainError(error) };
  const parsed = attemptPayloadSchema.safeParse(data);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: "unknown" };
}

/** Envía las respuestas; la base corrige y guarda la nota. */
export async function submitTestAction(
  attemptId: string,
  answers: Record<string, AnswerValue>,
): Promise<Outcome<AttemptResult>> {
  if (!(await signedIn()) || !UUID.test(attemptId)) return { ok: false, error: "forbidden" };
  const clean: Record<string, AnswerValue> = {};
  for (const [id, value] of Object.entries(answers)) {
    if (!UUID.test(id)) continue;
    if (typeof value === "string") clean[id] = value.slice(0, 200);
    else if (typeof value === "number" || typeof value === "boolean") clean[id] = value;
  }
  const { data, error } = await (await createClient()).rpc("submit_test", { p_attempt_id: attemptId, p_answers: clean });
  if (error) return { ok: false, error: toDomainError(error) };
  const parsed = attemptResultSchema.safeParse(data);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: "unknown" };
}
