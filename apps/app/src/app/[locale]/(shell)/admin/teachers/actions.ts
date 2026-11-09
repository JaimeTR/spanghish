"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { provisionAccount } from "@/lib/people/provision";
import { requireArea } from "@/lib/require-area";
import { inviteTeacherSchema, suspendAccountSchema } from "@/lib/schemas/people";
import { createClient } from "@/lib/supabase/server";

export type InviteField = "email" | "fullName" | "locale";

/**
 * Alta de docente. La comprobación de admin va ANTES de cualquier uso de la
 * service_role (provisionAccount).
 */
export async function inviteTeacher(
  _prev: ActionState<InviteField>,
  formData: FormData,
): Promise<ActionState<InviteField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");

  const parsed = parseForm(inviteTeacherSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };

  const result = await provisionAccount({
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    initialRole: "teacher",
    locale: parsed.data.locale,
  });
  if (!result.ok) {
    if (result.error === "exists") return { status: "error", error: "conflict" };
    if (result.error === "invalid") return { status: "invalid", fieldErrors: { email: "email" } };
    return { status: "error", error: "unknown" };
  }

  revalidatePath(`/${locale}/admin/teachers`);
  redirect(`/${locale}/admin/teachers?invited=${result.emailSent ? "sent" : "nomail"}`);
}

/** Suspende o reactiva una cuenta (RLS y triggers: solo admin; nunca la última admin). */
export async function setAccountSuspended(
  _prev: ActionState<"userId" | "suspended">,
  formData: FormData,
): Promise<ActionState<"userId" | "suspended">> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");

  const parsed = parseForm(suspendAccountSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ status: parsed.data.suspended === "true" ? "suspended" : "active" })
    .eq("id", parsed.data.userId)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data) return { status: "error", error: "not_found" };

  revalidatePath(`/${locale}/admin/teachers`);
  return { status: "ok" };
}
