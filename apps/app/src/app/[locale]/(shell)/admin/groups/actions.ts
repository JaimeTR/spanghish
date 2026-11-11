"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionLocale } from "@/lib/action-locale";
import { toDomainError } from "@/lib/db-errors";
import { parseForm, type ActionState } from "@/lib/forms";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";

const FORMATS = ["individual", "own_group", "local_group"] as const;
const STATUSES = ["draft", "active", "completed", "cancelled"] as const;
/** Cupo máximo por formato (mismo criterio que el check de la tabla). */
const MAX_CAPACITY = { individual: 1, own_group: 2, local_group: 30 } as const;

const groupSchema = z
  .object({
    id: z.uuid().optional(),
    code: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .pipe(z.string().regex(/^[A-Z0-9-]{3,30}$/)),
    name: z.string().trim().min(1).max(120),
    programId: z.uuid(),
    editionId: z.uuid().optional(),
    teacherId: z.uuid().optional(),
    locationId: z.uuid().optional(),
    locationNote: z.string().trim().max(300).optional(),
    meetingUrl: z.url().max(500).refine((v) => v.startsWith("https://"), "url").optional(),
    format: z.enum(FORMATS),
    capacity: z.coerce.number().int().min(1).max(30),
    status: z.enum(STATUSES),
    isPublic: z.literal("on").optional(),
  })
  .superRefine((v, ctx) => {
    if (v.capacity > MAX_CAPACITY[v.format]) ctx.addIssue({ code: "custom", path: ["capacity"], message: "range" });
  });
export type GroupField = keyof z.input<typeof groupSchema> & string;

/** Alta o edición de un grupo (solo administración; RLS lo repite). */
export async function saveGroup(_prev: ActionState<GroupField>, formData: FormData): Promise<ActionState<GroupField>> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(groupSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const v = parsed.data;
  const row = {
    code: v.code,
    name: v.name,
    program_id: v.programId,
    edition_id: v.editionId ?? null,
    teacher_id: v.teacherId ?? null,
    location_id: v.locationId ?? null,
    location_note: v.locationNote ?? null,
    meeting_url: v.meetingUrl ?? null,
    format: v.format,
    capacity: v.capacity,
    status: v.status,
    is_public: v.isPublic === "on",
  };
  const supabase = await createClient();
  const { data, error } = v.id
    ? await supabase.from("groups").update(row).eq("id", v.id).select("id").maybeSingle()
    : await supabase.from("groups").insert(row).select("id").maybeSingle();
  if (error) return { status: "error", error: toDomainError(error) };
  if (!data) return { status: "error", error: "not_found" };
  revalidatePath(`/${locale}/admin/groups`);
  return { status: "ok" };
}

const idSchema = z.object({ id: z.uuid() });

/** Elimina un grupo sin matrículas ni reservas (si las tiene, la base lo impide: se cancela en su lugar). */
export async function deleteGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = actionLocale(formData);
  await requireArea(locale, "admin");
  const parsed = parseForm(idSchema, formData);
  if (!parsed.ok) return { status: "error", error: "invalid" };
  const { error } = await (await createClient()).from("groups").delete().eq("id", parsed.data.id);
  if (error) return { status: "error", error: toDomainError(error) };
  revalidatePath(`/${locale}/admin/groups`);
  return { status: "ok" };
}
