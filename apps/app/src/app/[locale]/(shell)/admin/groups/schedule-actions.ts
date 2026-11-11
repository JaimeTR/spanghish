"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function revalidate(locale: string) {
  revalidatePath(`/${locale}/admin/groups`);
  revalidatePath(`/${locale}/admin/calendar`);
}

const ruleSchema = z.object({
  groupId: z.uuid(),
  weekday: z.coerce.number().int().min(1).max(7),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.coerce.number().int().min(15).max(240),
  startsOn: z.string().regex(DAY),
  endsOn: z.string().regex(DAY).optional(),
});
export type RuleField = keyof z.input<typeof ruleSchema> & string;

/** Añade un horario semanal a un grupo (las clases se crean con "Generar clases"). */
export async function addRule(_prev: ActionState<RuleField>, formData: FormData): Promise<ActionState<RuleField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(ruleSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const v = parsed.data;
  if (v.endsOn && v.endsOn < v.startsOn) return { status: "invalid", fieldErrors: { endsOn: "range" } };
  const { error } = await (await createClient()).from("schedule_rules").insert({
    group_id: v.groupId,
    weekday: v.weekday,
    start_time: v.startTime,
    duration_minutes: v.durationMinutes,
    starts_on: v.startsOn,
    ends_on: v.endsOn ?? null,
  });
  if (error) return { status: "error", error: toDomainError(error) };
  revalidate(locale);
  return { status: "ok" };
}

const idSchema = z.object({ id: z.uuid() });

/** Quita un horario (las clases ya generadas se conservan). */
export async function deleteRule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(idSchema, formData);
  if (!parsed.ok) return { status: "error", error: "invalid" };
  const { error } = await (await createClient()).from("schedule_rules").delete().eq("id", parsed.data.id);
  if (error) return { status: "error", error: toDomainError(error) };
  revalidate(locale);
  return { status: "ok" };
}

const generateSchema = z.object({ groupId: z.uuid(), until: z.string().regex(DAY) });
export type GenerateField = keyof z.input<typeof generateSchema> & string;

/** Crea las clases del grupo desde sus horarios hasta la fecha (no duplica las que ya existen). */
export async function generateSessions(_prev: ActionState<GenerateField>, formData: FormData): Promise<ActionState<GenerateField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(generateSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const { error } = await (await createClient()).rpc("generate_sessions", { p_group_id: parsed.data.groupId, p_until: parsed.data.until });
  if (error) return { status: "error", error: toDomainError(error) };
  revalidate(locale);
  return { status: "ok" };
}
