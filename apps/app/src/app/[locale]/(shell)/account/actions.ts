"use server";

import { revalidatePath } from "next/cache";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { profileSchema } from "@/lib/schemas/profile";
import { requireArea } from "@/lib/require-area";
import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type ProfileField = "fullName" | "phone" | "birthDate" | "address" | "city" | "country" | "preferredLocale";

/**
 * Guarda un perfil. Sin `userId` en el formulario es el de quien tiene la sesión
 * (cualquier rol). Con `userId` de otra persona, solo administración (se
 * comprueba aquí y lo repiten RLS y los privilegios por columna).
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

  const requested = formData.get("userId");
  let targetId = user.id;
  if (typeof requested === "string" && requested !== user.id) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requested)) return { status: "error", error: "not_found" };
    await requireArea(locale, "admin");
    targetId = requested;
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
    .eq("id", targetId)
    .select("id");
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data?.length) return { status: "error", error: "forbidden" };

  revalidatePath(`/${locale}`, "layout");
  return { status: "ok" };
}
