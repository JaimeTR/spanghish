"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseForm, type ActionState } from "@/lib/forms";
import { toDomainError } from "@/lib/db-errors";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { lessonSchema, moveSchema, publishSchema, type LessonField } from "@/lib/schemas/content";
import { pingWebRevalidate } from "@/lib/web-revalidate";

async function refresh(locale: string, published: boolean) { revalidatePath(`/${locale}/admin/lessons`); if (published) await pingWebRevalidate(); }
export async function saveLesson(_prev: ActionState<LessonField>, formData: FormData): Promise<ActionState<LessonField>> {
  const locale = String(formData.get("locale") ?? "es"); const user = await requireArea(locale as "es" | "en", "admin");
  const parsed = parseForm(lessonSchema, formData); if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };
  const { data } = parsed; const db = await createClient();
  const values = { slug: data.slug, category: data.category, level_id: data.levelId ?? null, access_level: data.accessLevel, title_es: data.titleEs, title_en: data.titleEn, summary_es: data.summaryEs ?? null, summary_en: data.summaryEn ?? null, teaser_public: data.teaserPublic, language_code: "es" };
  if (data.id) {
    const { data: old } = await db.from("lessons").select("kind, status").eq("id", data.id).maybeSingle(); if (!old) return { status: "error", error: "not_found" };
    const patch = old.kind === "interactive" ? { title_es: data.titleEs, title_en: data.titleEn, summary_es: data.summaryEs ?? null, summary_en: data.summaryEn ?? null, teaser_public: data.teaserPublic } : values;
    const { error } = await db.from("lessons").update(patch).eq("id", data.id); if (error) { const domain = toDomainError(error); return domain === "slug_taken" ? { status: "invalid", fieldErrors: { slug: "slugTaken" } } : { status: "error", error: domain }; }
    await refresh(locale, old.status === "published"); return { status: "ok" };
  }
  const { data: last } = await db.from("lessons").select("sort_order").eq("category", data.category).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data: created, error } = await db.from("lessons").insert({ ...values, kind: "article", sort_order: (last?.sort_order ?? 0) + 10, created_by: user.id }).select("id").single();
  if (error) { const domain = toDomainError(error); return domain === "slug_taken" ? { status: "invalid", fieldErrors: { slug: "slugTaken" } } : { status: "error", error: domain }; } await refresh(locale, false); redirect(`/${locale}/admin/lessons/${created.id}`);
}
export async function setLessonPublished(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "es"); await requireArea(locale as "es" | "en", "admin"); const parsed = parseForm(publishSchema, formData);
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors }; const db = await createClient();
  const { error } = await db.from("lessons").update({ status: parsed.data.publish === "true" ? "published" : "draft", published_at: parsed.data.publish === "true" ? new Date().toISOString() : null }).eq("id", parsed.data.id);
  if (error) return { status: "error", error: toDomainError(error) }; await refresh(locale, true); return { status: "ok" };
}
export async function moveLesson(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "es"); await requireArea(locale as "es" | "en", "admin"); const parsed = parseForm(moveSchema, formData); if (!parsed.ok) return;
  const db = await createClient(); const { data: lesson } = await db.from("lessons").select("status").eq("id", parsed.data.id).maybeSingle();
  await db.rpc("move_lesson", { p_lesson_id: parsed.data.id, p_direction: parsed.data.direction }); revalidatePath(`/${locale}/admin/lessons`); if (lesson?.status === "published") await pingWebRevalidate();
}
export async function deleteLesson(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const locale = String(formData.get("locale") ?? "es"); await requireArea(locale as "es" | "en", "admin"); const id = formData.get("id"); if (typeof id !== "string") return { status: "error", error: "not_found" };
  const db = await createClient(); const { data: row } = await db.from("lessons").select("kind, status, lesson_blocks(image_path)").eq("id", id).maybeSingle(); if (!row) return { status: "error", error: "not_found" };
  if (row.kind !== "article") return { status: "error", error: "forbidden" };
  const { error } = await db.from("lessons").delete().eq("id", id); if (error) return { status: "error", error: toDomainError(error) };
  const images = row.lesson_blocks.map((block) => block.image_path).filter((path): path is string => Boolean(path)); if (images.length) await db.storage.from("content-media").remove(images);
  await refresh(locale, row.status === "published"); return { status: "ok" };
}
