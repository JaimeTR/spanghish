"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { parseAudToCents } from "@/lib/money";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function revalidate(locale: string) {
  revalidatePath(`/${locale}/admin/students`, "layout");
  revalidatePath(`/${locale}/student`, "layout");
  revalidatePath(`/${locale}/guardian`, "layout");
}

const packSchema = z.object({
  studentId: z.uuid(),
  programId: z.uuid().optional(),
  lessons: z.coerce.number().int().min(1).max(200),
  startsOn: z.string().regex(DAY).optional(),
  expiresOn: z.string().regex(DAY).optional(),
  amount: z.string().trim().refine((v) => parseAudToCents(v) !== null, "number").optional(),
  note: z.string().trim().max(300).optional(),
});
export type PackField = keyof z.input<typeof packSchema> & string;

/** Agrega un pack de clases a un alumno (administración). */
export async function createPack(_prev: ActionState<PackField>, formData: FormData): Promise<ActionState<PackField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(packSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const v = parsed.data;
  if (v.startsOn && v.expiresOn && v.expiresOn < v.startsOn) return { status: "invalid", fieldErrors: { expiresOn: "range" } };
  const { error } = await (await createClient()).from("credit_packs").insert({
    student_id: v.studentId,
    program_id: v.programId ?? null,
    lessons_total: v.lessons,
    ...(v.startsOn ? { starts_on: v.startsOn } : {}),
    expires_on: v.expiresOn ?? null,
    amount_cents: v.amount ? parseAudToCents(v.amount) : null,
    note: v.note ?? null,
  });
  if (error) return { status: "error", error: toDomainError(error) };
  revalidate(locale);
  return { status: "ok" };
}

const adjustSchema = z.object({
  packId: z.uuid(),
  studentId: z.uuid(),
  delta: z.coerce.number().int().refine((n) => n !== 0 && Math.abs(n) <= 100, "range"),
  note: z.string().trim().min(1).max(300),
});
export type AdjustField = keyof z.input<typeof adjustSchema> & string;

/** Suma o resta clases a un pack con un motivo (queda en el libro; el saldo no baja de cero). */
export async function adjustPack(_prev: ActionState<AdjustField>, formData: FormData): Promise<ActionState<AdjustField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(adjustSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const v = parsed.data;
  const supabase = await createClient();
  const balance = await supabase.from("credit_pack_balances").select("remaining").eq("pack_id", v.packId).maybeSingle();
  if (balance.error) return { status: "error", error: toDomainError(balance.error) };
  if (!balance.data) return { status: "error", error: "not_found" };
  if ((balance.data.remaining ?? 0) + v.delta < 0) return { status: "invalid", fieldErrors: { delta: "range" } };
  const { error } = await supabase.from("credit_movements").insert({ pack_id: v.packId, student_id: v.studentId, delta: v.delta, reason: "adjustment", note: v.note });
  if (error) return { status: "error", error: toDomainError(error) };
  revalidate(locale);
  return { status: "ok" };
}

const voidSchema = z.object({ id: z.uuid(), reason: z.string().trim().max(300).optional() });

/** Anula un pack (no se usa más; los movimientos ya hechos se conservan). */
export async function voidPack(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(voidSchema, formData);
  if (!parsed.ok) return { status: "error", error: "invalid" };
  const { data, error } = await (await createClient())
    .from("credit_packs")
    .update({ voided_at: new Date().toISOString(), voided_reason: parsed.data.reason ?? null })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data) return { status: "error", error: "not_found" };
  revalidate(locale);
  return { status: "ok" };
}
