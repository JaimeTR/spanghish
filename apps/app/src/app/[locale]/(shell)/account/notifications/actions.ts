"use server";

import { revalidatePath } from "next/cache";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import type { ActionState } from "@/lib/forms";
import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Marca como leídos todos los avisos de quien tiene la sesión (RLS limita a los suyos). */
export async function markAllRead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  const user = await getSessionUser();
  if (!user || user.roles.length === 0) return { status: "error", error: "forbidden" };
  const { error } = await (await createClient()).from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (error) return { status: "error", error: toDomainError(error) };
  revalidatePath(`/${locale}`, "layout");
  return { status: "ok" };
}
