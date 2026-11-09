"use server";

import { revalidatePath } from "next/cache";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { requireArea } from "@/lib/require-area";
import { consentTextSchema } from "@/lib/schemas/people";
import { createClient } from "@/lib/supabase/server";

export type ConsentTextField = "kind" | "bodyEs" | "bodyEn" | "effectiveFrom";

/**
 * Nueva versión de un texto de consentimiento: id = <tipo>-v<n+1>. Los textos
 * son inmutables (la BD rechaza editar o borrar); para cambiar uno se crea otra
 * versión. Dos altas a la vez chocan en la clave primaria ("conflict").
 */
export async function createConsentText(
  _prev: ActionState<ConsentTextField>,
  formData: FormData,
): Promise<ActionState<ConsentTextField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");

  const parsed = parseForm(consentTextSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const d = parsed.data;

  const supabase = await createClient();
  const existing = await supabase.from("consent_texts").select("id").eq("kind", d.kind);
  if (existing.error) return { status: "error", error: toDomainError(existing.error) };
  const versions = existing.data.map((t) => Number(/-v(\d+)$/.exec(t.id)?.[1] ?? 0));
  const id = `${d.kind}-v${Math.max(0, ...versions) + 1}`;

  const { error } = await supabase.from("consent_texts").insert({
    id,
    kind: d.kind,
    body_es: d.bodyEs,
    body_en: d.bodyEn,
    effective_from: d.effectiveFrom,
  });
  if (error) return { status: "error", error: toDomainError(error) };

  revalidatePath(`/${locale}/admin/settings/consent-texts`);
  revalidatePath(`/${locale}/admin/students`, "layout");
  return { status: "ok" };
}
