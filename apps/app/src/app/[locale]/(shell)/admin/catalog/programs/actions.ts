"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { requireArea } from "@/lib/require-area";
import { deactivatePriceSchema, editionSchema, priceSchema, programSchema } from "@/lib/schemas/catalog";
import { createClient } from "@/lib/supabase/server";

export type ProgramField =
  | "id"
  | "code"
  | "nameEs"
  | "nameEn"
  | "descriptionEs"
  | "descriptionEn"
  | "languageCode"
  | "audience"
  | "format"
  | "levelId"
  | "durationWeeks"
  | "lessonMinutes"
  | "active"
  | "isPublic";

export type EditionField = "id" | "programId" | "labelEs" | "labelEn" | "startsOn" | "endsOn" | "status";
export type PriceField =
  | "programId"
  | "editionId"
  | "locationId"
  | "kind"
  | "amount"
  | "lessonsIncluded"
  | "labelEs"
  | "labelEn";

/** Alta (redirige a la ficha) o edición de un programa. RLS: solo admin escribe. */
export async function saveProgram(
  _prev: ActionState<ProgramField>,
  formData: FormData,
): Promise<ActionState<ProgramField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");

  const parsed = parseForm(programSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const d = parsed.data;
  const row = {
    code: d.code,
    name_es: d.nameEs,
    name_en: d.nameEn,
    description_es: d.descriptionEs ?? null,
    description_en: d.descriptionEn ?? null,
    language_code: d.languageCode,
    audience: d.audience,
    format: d.format,
    level_id: d.levelId ?? null,
    duration_weeks: d.durationWeeks ?? null,
    lesson_minutes: d.lessonMinutes,
    active: d.active,
    is_public: d.isPublic,
  };

  const supabase = await createClient();
  if (!d.id) {
    const { data, error } = await supabase.from("programs").insert(row).select("id").single();
    if (error) {
      if (error.code === "23505") return { status: "error", error: "conflict" };
      return { status: "error", error: toDomainError(error) };
    }
    revalidatePath(`/${locale}/admin/catalog`, "layout");
    redirect(`/${locale}/admin/catalog/programs/${data.id}`);
  }

  const { data, error } = await supabase.from("programs").update(row).eq("id", d.id).select("id").maybeSingle();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data) return { status: "error", error: "not_found" };
  revalidatePath(`/${locale}/admin/catalog`, "layout");
  return { status: "ok" };
}

/** Alta o edición de una edición (fechas en calendario de Brisbane, tipo date). */
export async function saveEdition(
  _prev: ActionState<EditionField>,
  formData: FormData,
): Promise<ActionState<EditionField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");

  const parsed = parseForm(editionSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const d = parsed.data;
  const row = {
    label_es: d.labelEs ?? null,
    label_en: d.labelEn ?? null,
    starts_on: d.startsOn,
    ends_on: d.endsOn,
    status: d.status,
  };

  const supabase = await createClient();
  const { data, error } = d.id
    ? await supabase
        .from("program_editions")
        .update(row)
        .eq("id", d.id)
        .eq("program_id", d.programId)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("program_editions")
        .insert({ ...row, program_id: d.programId })
        .select("id")
        .single();
  if (error) {
    // unique (program_id, starts_on): ya hay una edición que empieza ese día.
    if (error.code === "23505") return { status: "invalid", fieldErrors: { startsOn: "invalid" } };
    return { status: "error", error: toDomainError(error) };
  }
  if (!data) return { status: "error", error: "not_found" };

  revalidatePath(`/${locale}/admin/catalog/programs/${d.programId}`);
  return { status: "ok" };
}

/**
 * Alta de un precio (los precios no se editan: se desactiva el anterior y se
 * crea otro, así queda el historial). Un duplicado activo es "conflict".
 */
export async function savePrice(
  _prev: ActionState<PriceField>,
  formData: FormData,
): Promise<ActionState<PriceField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");

  const parsed = parseForm(priceSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("program_prices").insert({
    program_id: d.programId,
    edition_id: d.editionId ?? null,
    location_id: d.locationId ?? null,
    kind: d.kind,
    amount_cents: d.amount,
    lessons_included: d.lessonsIncluded ?? null,
    label_es: d.labelEs ?? null,
    label_en: d.labelEn ?? null,
  });
  if (error) {
    // FK compuesta: la edición no es de este programa.
    if (error.code === "23503" && error.message.includes("program_prices_edition_fk")) {
      return { status: "invalid", fieldErrors: { editionId: "invalid" } };
    }
    return { status: "error", error: toDomainError(error) };
  }

  revalidatePath(`/${locale}/admin/catalog/programs/${d.programId}`);
  return { status: "ok" };
}

export async function deactivatePrice(
  _prev: ActionState<"priceId" | "programId">,
  formData: FormData,
): Promise<ActionState<"priceId" | "programId">> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");

  const parsed = parseForm(deactivatePriceSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("program_prices")
    .update({ active: false })
    .eq("id", parsed.data.priceId)
    .eq("program_id", parsed.data.programId)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data) return { status: "error", error: "not_found" };

  revalidatePath(`/${locale}/admin/catalog/programs/${parsed.data.programId}`);
  return { status: "ok" };
}
