"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { parseAudToCents } from "@/lib/money";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";

const ENROLLMENT_STATUSES = ["pending", "active", "paused", "completed", "cancelled"] as const;
const BILLING_MODES = ["upfront", "pack", "payg", "free"] as const;
const MANUAL_METHODS = ["transfer", "cash", "eventbrite", "other"] as const;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Importe en dólares ("205" o "205.50") → centavos; vacío = sin importe. */
const amount = z.string().trim().refine((v) => parseAudToCents(v) !== null, "number");

function revalidate(locale: string) {
  revalidatePath(`/${locale}/admin/enrollments`);
  revalidatePath(`/${locale}/admin/groups`);
  revalidatePath(`/${locale}/admin/payments`);
}

// ---------------------------------------------------------------------------
// Matrículas
// ---------------------------------------------------------------------------
const enrollmentSchema = z.object({
  studentId: z.uuid(),
  groupId: z.uuid(),
  priceId: z.uuid().optional(),
  billingMode: z.enum(BILLING_MODES),
  agreedAmount: amount.optional(),
  startsOn: z.string().regex(DAY).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type EnrollmentField = keyof z.input<typeof enrollmentSchema> & string;

/** Alta manual de una matrícula. El cupo, el estado del grupo y el consentimiento de menores los vigila la base. */
export async function createEnrollment(_prev: ActionState<EnrollmentField>, formData: FormData): Promise<ActionState<EnrollmentField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(enrollmentSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const v = parsed.data;
  const { error } = await (await createClient()).from("enrollments").insert({
    student_id: v.studentId,
    group_id: v.groupId,
    status: "active",
    billing_mode: v.billingMode,
    price_id: v.priceId ?? null,
    agreed_amount_cents: v.billingMode === "free" ? 0 : v.agreedAmount ? parseAudToCents(v.agreedAmount) : null,
    ...(v.startsOn ? { starts_on: v.startsOn } : {}),
    notes: v.notes ?? null,
  });
  if (error) return { status: "error", error: toDomainError(error) };
  revalidate(locale);
  return { status: "ok" };
}

const enrollmentStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(ENROLLMENT_STATUSES),
  agreedAmount: amount.optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type EnrollmentStatusField = keyof z.input<typeof enrollmentStatusSchema> & string;

/** Estado, importe acordado y notas de una matrícula (cancelar libera la plaza; reactivar vuelve a comprobar el cupo). */
export async function updateEnrollment(_prev: ActionState<EnrollmentStatusField>, formData: FormData): Promise<ActionState<EnrollmentStatusField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(enrollmentStatusSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const v = parsed.data;
  const { data, error } = await (await createClient())
    .from("enrollments")
    .update({ status: v.status, agreed_amount_cents: v.agreedAmount ? parseAudToCents(v.agreedAmount) : null, notes: v.notes ?? null })
    .eq("id", v.id)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data) return { status: "error", error: "not_found" };
  revalidate(locale);
  return { status: "ok" };
}

// ---------------------------------------------------------------------------
// Pagos manuales
// ---------------------------------------------------------------------------
const paymentSchema = z.object({
  enrollmentId: z.uuid(),
  studentId: z.uuid(),
  method: z.enum(MANUAL_METHODS),
  amount: amount.refine((v) => (parseAudToCents(v) ?? 0) > 0, "range"),
  reference: z.string().trim().max(200).optional(),
  note: z.string().trim().max(500).optional(),
});
export type PaymentField = keyof z.input<typeof paymentSchema> & string;

/** Registra un pago manual (transferencia, efectivo…) de una matrícula. Los de Stripe los registra el servidor. */
export async function recordPayment(_prev: ActionState<PaymentField>, formData: FormData): Promise<ActionState<PaymentField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(paymentSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const v = parsed.data;
  const { error } = await (await createClient()).from("enrollment_payments").insert({
    enrollment_id: v.enrollmentId,
    // La base copia el alumno de la matrícula: este valor solo cumple el tipo.
    student_id: v.studentId,
    method: v.method,
    amount_cents: parseAudToCents(v.amount)!,
    reference: v.reference ?? null,
    note: v.note ?? null,
  });
  if (error) return { status: "error", error: toDomainError(error) };
  revalidate(locale);
  return { status: "ok" };
}

// ---------------------------------------------------------------------------
// Prematrículas (reservas de la web)
// ---------------------------------------------------------------------------
const confirmSchema = z.object({
  id: z.uuid(),
  method: z.enum(MANUAL_METHODS),
  amount,
  reference: z.string().trim().max(200).optional(),
  note: z.string().trim().max(500).optional(),
});
export type ConfirmField = keyof z.input<typeof confirmSchema> & string;

/** Confirma una prematrícula con un pago manual (importe 0 = beca): crea ficha, matrícula y pago. Respeta el cupo. */
export async function confirmRequest(_prev: ActionState<ConfirmField>, formData: FormData): Promise<ActionState<ConfirmField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(confirmSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const v = parsed.data;
  const { error } = await (await createClient()).rpc("admin_confirm_request", {
    p_request_id: v.id,
    p_payment: { method: v.method, amount_cents: parseAudToCents(v.amount) ?? 0, reference: v.reference ?? "", note: v.note ?? "" },
  });
  if (error) return { status: "error", error: toDomainError(error) };
  revalidate(locale);
  revalidatePath(`/${locale}/admin/students`);
  return { status: "ok" };
}

const requestActionSchema = z.object({ id: z.uuid(), action: z.enum(["offer", "cancel"]) });

/** "Ofrecer plaza" (lista de espera o caducada → reserva de 5 días) o "cancelar" (libera la plaza). */
export async function updateRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(requestActionSchema, formData);
  if (!parsed.ok) return { status: "error", error: "invalid" };
  const { error } = await (await createClient()).rpc("admin_update_request", { p_request_id: parsed.data.id, p_action: parsed.data.action });
  if (error) return { status: "error", error: toDomainError(error) };
  revalidate(locale);
  return { status: "ok" };
}

const requestNotesSchema = z.object({ id: z.uuid(), adminNotes: z.string().trim().max(2000).optional() });
export type RequestNotesField = keyof z.input<typeof requestNotesSchema> & string;

export async function saveRequestNotes(_prev: ActionState<RequestNotesField>, formData: FormData): Promise<ActionState<RequestNotesField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(requestNotesSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const { data, error } = await (await createClient())
    .from("enrollment_requests")
    .update({ admin_notes: parsed.data.adminNotes ?? null })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data) return { status: "error", error: "not_found" };
  revalidate(locale);
  return { status: "ok" };
}
