"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  studentId: z.uuid(),
  kind: z.enum(["recordings", "photos"]),
  granted: z.enum(["true", "false"]),
});

/** El tutor da o retira el consentimiento de grabaciones o fotos de un hijo (la base repite quién puede y deja registro). */
export async function setConsent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireArea(locale, "guardian");
  const parsed = parseForm(schema, formData);
  if (!parsed.ok) return { status: "error", error: "invalid" };
  const { studentId, kind, granted } = parsed.data;
  const { error } = await (await createClient()).rpc("set_my_consent", { p_student_id: studentId, p_kind: kind, p_granted: granted === "true" });
  if (error) return { status: "error", error: toDomainError(error) };
  revalidatePath(`/${locale}/guardian`, "layout");
  return { status: "ok" };
}
