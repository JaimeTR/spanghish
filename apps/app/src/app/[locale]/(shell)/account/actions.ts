"use server";

import { revalidatePath } from "next/cache";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { profileSchema } from "@/lib/schemas/profile";
import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type ProfileField = "fullName" | "phone" | "birthDate" | "address" | "city" | "country" | "preferredLocale";

/**
 * Guarda el perfil de quien tiene la sesión (cualquier rol). La fila es siempre
 * la del usuario autenticado: el id no viene del formulario. RLS y los
 * privilegios por columna repiten la regla en la base de datos.
 */
export async function saveProfile(
  _prev: ActionState<ProfileField>,
  formData: FormData,
): Promise<ActionState<ProfileField>> {
  const locale = actionLocale(formData);
  const user = await getSessionUser();
  if (!user || user.status !== "active" || user.roles.length === 0) {
    return { status: "error", error: "forbidden" };
  }

  const parsed = parseForm(profileSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: d.fullName,
      phone: d.phone ?? null,
      birth_date: d.birthDate ?? null,
      address: d.address ?? null,
      city: d.city ?? null,
      country: d.country ?? null,
      preferred_locale: d.preferredLocale,
    })
    .eq("id", user.id)
    .select("id");
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data?.length) return { status: "error", error: "forbidden" };

  revalidatePath(`/${locale}`, "layout");
  return { status: "ok" };
}
