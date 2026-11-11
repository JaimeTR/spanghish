"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseForm, type ActionState } from "@/lib/forms";
import { toDomainError } from "@/lib/db-errors";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { publishSchema, moveSchema, teacherProfileSchema, type TeacherProfileField } from "@/lib/schemas/content";
import { pingWebRevalidate } from "@/lib/web-revalidate";

async function changed(locale: string, published: boolean) { revalidatePath(`/${locale}/admin/teachers`); if (published) await pingWebRevalidate(); }
export async function saveTeacherProfile(_prev: ActionState<TeacherProfileField>, formData: FormData): Promise<ActionState<TeacherProfileField>> {
  const locale = String(formData.get("locale") ?? "es"); const user = await requireArea(locale as "es" | "en", "admin");
  const parsed = parseForm(teacherProfileSchema, formData); if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const d = parsed.data; const db = await createClient();
  const values = { slug: d.slug, name: d.name, photo_position: d.photoPosition, profile_id: d.profileId ?? null, photo_alt_es: d.photoAltEs, photo_alt_en: d.photoAltEn, role_es: d.roleEs, role_en: d.roleEn, tagline_es: d.taglineEs, tagline_en: d.taglineEn, meta_description_es: d.metaDescriptionEs, meta_description_en: d.metaDescriptionEn, intro_es: d.introEs, intro_en: d.introEn, body_es: d.bodyEs, body_en: d.bodyEn, specialty_es: d.specialtyEs ?? null, specialty_en: d.specialtyEn ?? null, enrol_title_es: d.enrolTitleEs ?? null, enrol_title_en: d.enrolTitleEn ?? null, enrol_es: d.enrolEs ?? null, enrol_en: d.enrolEn ?? null, facts_es: d.factsEs, facts_en: d.factsEn, show_approach: d.showApproach };
  try {
    if (d.id) { const { data: prior } = await db.from("teacher_profiles").select("status").eq("id", d.id).maybeSingle(); const { error } = await db.from("teacher_profiles").update(values).eq("id", d.id); if (error) return error.code === "23505" ? { status: "invalid", fieldErrors: { slug: "slugTaken" } } : { status: "error", error: toDomainError(error) }; await changed(locale, prior?.status === "published"); return { status: "ok" }; }
    const { data: last } = await db.from("teacher_profiles").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data: row, error } = await db.from("teacher_profiles").insert({ ...values, sort_order: (last?.sort_order ?? 0) + 10, created_by: user.id }).select("id").single();
    if (error) return error.code === "23505" ? { status: "invalid", fieldErrors: { slug: "slugTaken" } } : { status: "error", error: toDomainError(error) };
    await changed(locale, false); redirect(`/${locale}/admin/teachers/profiles/${row.id}?saved=1`);
  } catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; return { status: "error", error: "unknown" }; }
}
export async function setTeacherProfilePublished(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "es"); await requireArea(locale as "es" | "en", "admin"); const p = parseForm(publishSchema, formData); if (!p.ok) return { status: "invalid", fieldErrors: p.fieldErrors };
  const db = await createClient(); const { error } = await db.from("teacher_profiles").update({ status: p.data.publish === "true" ? "published" : "draft", published_at: p.data.publish === "true" ? new Date().toISOString() : null }).eq("id", p.data.id);
  if (error) return { status: "error", error: toDomainError(error) }; await changed(locale, true); return { status: "ok" };
}
export async function moveTeacherProfile(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "es"); await requireArea(locale as "es" | "en", "admin"); const p = parseForm(moveSchema, formData); if (!p.ok) throw new Error("Invalid move request");
  const db = await createClient(); const { data: row } = await db.from("teacher_profiles").select("status").eq("id", p.data.id).maybeSingle(); const { error } = await db.rpc("move_teacher_profile", { p_id: p.data.id, p_direction: p.data.direction }); if (error) throw error;
  revalidatePath(`/${locale}/admin/teachers`); if (row?.status === "published") await pingWebRevalidate();
}
export async function deleteTeacherProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "es"); await requireArea(locale as "es" | "en", "admin"); const id = formData.get("id"); if (typeof id !== "string") return { status: "error", error: "not_found" };
  const db = await createClient(); const { data: row } = await db.from("teacher_profiles").select("status, photo_path").eq("id", id).maybeSingle(); const { error } = await db.from("teacher_profiles").delete().eq("id", id); if (error) return { status: "error", error: toDomainError(error) };
  if (row?.photo_path?.startsWith("teachers/")) await db.storage.from("content-media").remove([row.photo_path]); await changed(locale, row?.status === "published"); return { status: "ok" };
}
