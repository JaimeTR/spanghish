"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { provisionAccount } from "@/lib/people/provision";
import { requireArea } from "@/lib/require-area";
import { APP_ROLES, inviteUserSchema } from "@/lib/schemas/people";
import { createClient } from "@/lib/supabase/server";

export type InviteUserField = "email" | "fullName" | "role" | "locale";

type Role = (typeof APP_ROLES)[number];

/**
 * Deja la cuenta con exactamente estos roles: primero añade los que faltan y
 * después quita los que sobran (así nunca se queda sin ninguno y la base
 * impide quitar el rol a la última administradora activa).
 */
async function applyRoles(
  db: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  wanted: Role[],
): Promise<{ ok: true } | { ok: false; error: ReturnType<typeof toDomainError> }> {
  const current = await db.from("user_roles").select("role").eq("user_id", userId);
  if (current.error) return { ok: false, error: toDomainError(current.error) };
  const have = new Set(current.data.map((r) => r.role));
  const toAdd = wanted.filter((r) => !have.has(r));
  const toRemove = [...have].filter((r) => !wanted.includes(r));

  if (toAdd.length) {
    const added = await db.from("user_roles").insert(toAdd.map((role) => ({ user_id: userId, role })));
    if (added.error) return { ok: false, error: toDomainError(added.error) };
  }
  for (const role of toRemove) {
    const removed = await db.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (removed.error) return { ok: false, error: toDomainError(removed.error) };
  }
  return { ok: true };
}

/**
 * Alta de una cuenta con cualquier rol: la persona recibe un enlace para elegir
 * contraseña. La comprobación de admin va ANTES de usar la service_role.
 */
export async function inviteUser(
  _prev: ActionState<InviteUserField>,
  formData: FormData,
): Promise<ActionState<InviteUserField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");

  const parsed = parseForm(inviteUserSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const d = parsed.data;

  const result = await provisionAccount({
    email: d.email,
    fullName: d.fullName,
    // admin no se puede pedir por metadatos: se crea como alumno y se cambia abajo.
    initialRole: d.role === "admin" ? "student" : d.role,
    locale: d.locale,
  });
  if (!result.ok) {
    if (result.error === "exists") return { status: "error", error: "conflict" };
    if (result.error === "invalid") return { status: "invalid", fieldErrors: { email: "email" } };
    return { status: "error", error: "unknown" };
  }

  if (d.role === "admin") {
    const applied = await applyRoles(await createClient(), result.userId, ["admin"]);
    if (!applied.ok) return { status: "error", error: applied.error };
  }

  revalidatePath(`/${locale}/admin`, "layout");
  redirect(`/${locale}/admin/users/${result.userId}?invited=${result.emailSent ? "sent" : "nomail"}`);
}

/** Cambia los roles de una cuenta. Debe quedar al menos uno. */
export async function saveUserRoles(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");

  const userId = formData.get("userId");
  if (typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId)) return { status: "error", error: "not_found" };
  const wanted = APP_ROLES.filter((r) => formData.getAll("role").includes(r));
  if (wanted.length === 0) return { status: "invalid", fieldErrors: { role: "required" } };

  const applied = await applyRoles(await createClient(), userId, wanted);
  if (!applied.ok) return { status: "error", error: applied.error };

  revalidatePath(`/${locale}/admin`, "layout");
  return { status: "ok" };
}
