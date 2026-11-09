"use server";

import { revalidatePath } from "next/cache";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { requireArea } from "@/lib/require-area";
import { locationSchema } from "@/lib/schemas/catalog";
import { createClient } from "@/lib/supabase/server";

export type LocationField = "id" | "name" | "kind" | "region" | "address" | "mapUrl" | "active";

/** Alta (sin id) o edición (con id) de una sede. RLS: solo admin escribe. */
export async function saveLocation(
  _prev: ActionState<LocationField>,
  formData: FormData,
): Promise<ActionState<LocationField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");

  const parsed = parseForm(locationSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const { id, name, kind, region, address, mapUrl, active } = parsed.data;
  const row = { name, kind, region, address: address ?? null, map_url: mapUrl ?? null, active };

  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("locations").update(row).eq("id", id).select("id").maybeSingle()
    : await supabase.from("locations").insert(row).select("id").single();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data) return { status: "error", error: "not_found" };

  revalidatePath(`/${locale}/admin/catalog`, "layout");
  return { status: "ok" };
}
